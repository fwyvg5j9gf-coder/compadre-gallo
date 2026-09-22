import 'server-only'

import sanitizeHtmlLib from 'sanitize-html'

// Cualquiera que le escriba a hola@compadregallo.com puede meter HTML
// arbitrario (<script>, <img onerror=...>, un <form> de phishing) en un correo
// que después se abre dentro de la sesión autenticada del panel.
//
// Hoy `casa/soporte` pinta ese HTML en un <iframe sandbox> sin allow-scripts,
// así que el JS no corre. Esto es la segunda capa: el día que alguien agregue
// allow-scripts al iframe, o cambie el iframe por dangerouslySetInnerHTML, el
// contenido ya viene limpio de la base y no hay ventana de exposición.
//
// Se aplica al guardar (webhook de entrada) y al leer — nunca solo un lado,
// porque los renglones viejos se guardaron sin pasar por aquí.
// Tomado de gangstafairy, que tuvo exactamente ese bug (auditoría, 19 sep 2026).
export function sanitizeEmailHtml(html: string | null): string | null {
  if (!html) return html
  return sanitizeHtmlLib(html, {
    allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'div', 'span', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr'],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'width', 'height'],
      '*': ['style'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'cid'],
    allowedSchemesByTag: { img: ['http', 'https', 'cid'] },
    // El style inline es donde vive casi todo el formato real de un correo
    // (color, tamaño de fuente). Se permite, pero con una lista cerrada de
    // propiedades: así no entra url() ni expression(), que podrían traer
    // contenido remoto o, en navegadores viejos, ejecutar JS.
    allowedStyles: {
      '*': {
        color: [/^.*$/],
        'background-color': [/^.*$/],
        'font-size': [/^.*$/],
        'font-weight': [/^.*$/],
        'text-align': [/^.*$/],
        'line-height': [/^.*$/],
      },
    },
    disallowedTagsMode: 'discard',
  })
}
