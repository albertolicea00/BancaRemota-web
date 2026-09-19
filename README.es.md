# Banca Remota — Landing Page

[![GitHub Stars](https://img.shields.io/github/stars/albertolicea00/BancaRemota?style=flat&logo=github&label=stars&color=B38B4D)](https://github.com/albertolicea00/BancaRemota)
![HTML](https://img.shields.io/badge/HTML-E34F26?style=flat&logo=html5&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Alpine.js](https://img.shields.io/badge/Alpine.js-8BC0D0?style=flat&logo=alpinedotjs&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

Página de destino (landing page) + marcador USSD web para la aplicación iOS [Banca Remota](https://github.com/albertolicea00/BancaRemota). Sin paso de compilación.

[Read English version](README.md)

## Estructura

```
├── index.html        página de destino
├── dial.html         marcador USSD web (BPA / BANDEC / BM, funciona independiente desde la pantalla de inicio de iOS)
├── style.css         estilos de componentes
├── app.js            componentes Alpine.js (página de destino + formulario de notificación compartido)
├── op-icons.json     rutas de iconos usadas por las tarjetas de operación en dial.html
├── codes.json        copia local de los códigos USSD — NO descargado por dial.html en tiempo de ejecución
│                      (ver Soporte Offline abajo); mantenido en este repo, pero no usado por ninguna página
├── sw.js             service worker — soporte offline completo, ver Soporte Offline abajo
├── api/subscribe.js  función serverless de Vercel — añade correos electrónicos a Brevo
├── vercel.json       URLs limpias + caché a largo plazo para /assets
├── assets/           maquetas, iconos, logotipos de bancos
└── .env.example      variables de entorno requeridas
```

## Páginas

**`index.html`** — página de destino: hero, recorrido por funciones (pestañas fijadas al hacer scroll, solo escritorio), Preguntas Frecuentes (FAQ), sección de compatibilidad bancaria con un enlace de descarga de `codes.json` para colaboradores y el formulario de suscripción "Avísame". Realiza una petición en el cliente a `https://api.github.com/repos/albertolicea00/BancaRemota` para mostrar el conteo de estrellas de GitHub en vivo.

**`dial.html`** — marcador USSD web: selecciona un banco (barra de pestañas inferior en móvil, diseño de 3 columnas en escritorio), busca operaciones por nombre, toca una tarjeta para abrir `tel:<code>` y realizar la llamada. Mismo modo oscuro, formulario de notificación y guía de instalación de iOS que la página de destino. Consulta **Soporte Offline** abajo para ver cómo obtiene sus datos y funciona sin conexión.

Ambas páginas comparten `app.js` (`notifyForm()` para el formulario de suscripción, gestión de modo oscuro) y los estilos `.op-card` / `.bank-card` en `style.css`.

## Formulario "Avísame" / suscripción

`notifyForm()` en `app.js` envía un `{ email }` mediante `POST /api/subscribe` (`api/subscribe.js`, función serverless de Vercel), la cual añade la dirección a una lista de Brevo — utilizada tanto para "notificar cuando la app llegue a la App Store" como en general en las FAQ de la página de destino. Requiere `BREVO_API_KEY` y `BREVO_LIST_ID` (consulta `.env.example`).

## Guía iOS "Añadir a la pantalla de inicio"

En Safari de iOS (detectado vía UA / `MacIntel` + multitáctil, no en modo standalone aún), ambas páginas muestran un modal después de ~1.5s guiando al usuario a través de Compartir → Añadir a la pantalla de inicio, para que el sitio se comporte como una app instalada (icono propio, sin barra de Safari, `apple-mobile-web-app-capable`). La desestimación se recuerda en `localStorage['installGuideDismissed']`. El botón "Instalar" de la navegación lo vuelve a abrir bajo demanda mediante un evento personalizado `open-install-guide`. Irrelevante en Android/escritorio — restringido tras la verificación de iOS.

## Soporte Offline

`dial.html` no obtiene el `codes.json` local — siempre descarga el más reciente desde el contenido raw de GitHub del repositorio principal [BancaRemota](https://github.com/albertolicea00/BancaRemota) (la aplicación web depende directamente de `codes.json` del proyecto principal iOS):

```
https://raw.githubusercontent.com/albertolicea00/BancaRemota/refs/heads/main/BancaRemota/codes.json
```

La capacidad offline real reside en `sw.js`, un service worker registrado tanto en `index.html` como en `dial.html`. Una caché basada solo en `localStorage` (un enfoque anterior) solo cubre los *datos* — no hace nada por el cascarón (shell) HTML/CSS/JS en sí, por lo que la página aún podría fallar al cargar en offline tras expirar la caché HTTP del navegador. En su lugar, `sw.js` almacena todo lo necesario para renderizar la app en Cache Storage (que no tiene expiración):

- **Precargado en la instalación**: ambas páginas, `style.css`, `app.js`, `op-icons.json`, los SVGs de iconos de bancos, favicon, el `codes.json` remoto y los scripts CDN de Tailwind/Alpine de los que dependen las páginas. Se precarga explícitamente en lugar de dejarlo para la caché del primer uso, porque la primera petición de la página para `codes.json` se dispara desde el `init()` de Alpine *antes* de que el service worker termine de registrarse (el registro solo comienza en el evento `load`) — sin precargarlo, una instalación nueva que pase a estar offline antes de una segunda visita mostraría un cascarón funcional sin códigos.
- **En tiempo de ejecución (stale-while-revalidate)**: cualquier otra cosa solicitada posteriormente se sirve desde la caché de forma instantánea si está presente, con una nueva descarga en segundo plano para mantenerla actualizada para la próxima vez.

Efecto neto: tras una visita online exitosa, el marcador (y la página de destino) siguen funcionando sin conexión indefinidamente — incluso semanas o meses después —, manteniendo las correcciones de códigos USSD enviadas al repositorio principal de [BancaRemota](https://github.com/albertolicea00/BancaRemota) siempre que haya conexión disponible, sin necesidad de desplegar una nueva versión de este sitio web.

Dos detalles a tener en cuenta al modificar `sw.js`: incrementa `CACHE_NAME` cada vez que cambie la lista de precarga, o los usuarios recurrentes seguirán sirviendo el cascarón antiguo cacheado; y las URLs CDN de origen cruzado sin cabecera `Access-Control-Allow-Origin` (como `cdn.tailwindcss.com`) deben ser cacheadas mediante un `fetch()` manual + `cache.put()` con `mode: 'no-cors'` — `cache.add()`/`addAll()` lanzan un error con respuestas opacas por especificación.

El `codes.json` guardado en *este* repositorio no es leído por ninguna página — es el mismo contenido que incluye la app iOS, referenciado desde `index.html` (la sección "Bancos soportados" enlaza y describe la copia raw de GitHub para colaboradores que editan códigos USSD).

## Desarrollo local

```bash
npx serve .
```

## Despliegue

Push a `main` → Vercel despliega automáticamente. Añade las variables de entorno de `.env.example` en el panel de control de Vercel.

## Colores

| Token | Hex | |
|---|---|---|
| `--color-gold` | `#B38B4D` | Acento de marca principal |
| `--color-accent` | `#81D717` | Destacados en lima |
| `--color-bpa` | `#1E5F52` | Verde BPA |
| `--color-bandec` | `#5B2A1F` | Marrón BANDEC |
| `--color-bm` | `#1A3A6B` | Azul marino BM |


## Más Aplicaciones

Otras aplicaciones de códigos USSD del mismo autor:

- [CubaCell Connect](https://cubacell-connect.vercel.app/) — página de destino + marcador web para la alternativa no oficial para iOS a la app móvil de ETECSA en Cuba.


## Contribuir

Consulta el [CONTRIBUTING.md](https://github.com/albertolicea00/BancaRemota/blob/main/CONTRIBUTING.md) del proyecto principal. Los Issues, PRs y mensajes de commit deben estar en inglés.

---

*Parte del proyecto [Banca Remota](https://github.com/albertolicea00/BancaRemota) por [Alberto Licea](https://www.linkedin.com/in/albertolicea00).*
