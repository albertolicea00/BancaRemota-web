function app() {
  return {
    mobileMenuOpen: false,
    notifyOpen: false,
    githubStars: null,
    darkMode: localStorage.getItem('darkMode') === 'true' ||
      (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches),
    faqs: [
      {
        q: '¿Necesito internet para usar la app?',
        a: 'No. Banca Remota no usa internet en ningún momento. Las operaciones se realizan mediante códigos USSD sobre la red telefónica de ETECSA, igual que cuando marcas el código manualmente en el teléfono.'
      },
      {
        q: '¿Es seguro guardar mis datos en la app?',
        a: 'Sí. Todos los datos se guardan localmente en tu iPhone (UserDefaults). No hay servidores, no hay analíticas, no hay nube, y la sección de claves requiere Face ID / Touch ID. El código es open source: puedes verificarlo tú mismo en GitHub.'
      },
      {
        q: '¿Por qué no tiene las funcionalidades del Transfermóvil en Android?',
        a: 'Debido a las estrictas políticas de seguridad (sandbox) de Apple en iOS, las aplicaciones de terceros no tienen permisos para leer ni interceptar respuestas USSD de la red, encadenar sesiones silenciosamente ni ejecutar llamadas en segundo plano. Por diseño del sistema, la app transfiere el código USSD a la aplicación nativa de Teléfono (<code class="code-inline">tel://</code>) para que confirmes la llamada y respondas a los menús del banco.'
      },
      {
        q: '¿Por qué no hay widgets para marcar o comandos de voz con Siri?',
        a: 'Por dos razones técnicas y de seguridad: primero, las operaciones bancarias USSD requieren autenticación con PIN o clave privada, algo nada seguro ni recomendable para dictar en voz alta. Segundo, en iOS la directiva de sistema <code class="code-inline">APPLICATION_EXTENSION_API_ONLY</code> prohíbe que los widgets de WidgetKit abran llamadas telefónicas (<code class="code-inline">tel://</code>); un widget solo podría abrir la app pero jamás marcar directamente.'
      },
      {
        q: '¿Cómo funciona si tengo un iPhone Dual-SIM?',
        a: 'iOS no ofrece a aplicaciones de terceros ninguna API para forzar o seleccionar por cuál línea SIM realizar una llamada. La llamada USSD siempre se ejecutará por la línea que tengas configurada como predeterminada en los Ajustes de tu iPhone (Ajustes → Red celular / Teléfono).'
      },
      {
        q: '¿Es compatible con iPad o Apple Watch?',
        a: 'No. Apple no incluye soporte para códigos USSD ni en iPadOS ni en watchOS, incluso en modelos con ranura SIM o eSIM (Cellular). Carecen del marcador telefónico USSD necesario para procesar códigos como <code class="code-inline">*944#</code> o <code class="code-inline">*966#</code>. Por eso Banca Remota está diseñada exclusivamente para iPhone.'
      },
      {
        q: '¿Puedo usar Banca Remota sin instalar la app?',
        a: 'Sí. Entra a <a href="dial.html" class="text-gold underline hover:no-underline">/dial</a> — el marcador USSD corriendo directo en el navegador, sin Xcode ni cuenta de desarrollador. Agrégalo a tu pantalla de inicio y funciona incluso sin internet: después de la primera visita, la página y el listado de códigos quedan guardados en el propio navegador, así que abrirla semanas después sin conexión sigue funcionando.'
      },
      {
        q: '¿Cuándo estará en la App Store?',
        a: 'Actualmente está en revisión de las tiendas — disponible instalando desde el código fuente en GitHub. <button onclick="window.dispatchEvent(new CustomEvent(\'notify:open\'))" class="text-gold underline cursor-pointer">Suscríbete</button> para recibir una notificación en cuanto se publique en la App Store.'
      },
      {
        q: '¿Cuánto cuesta la app?',
        a: 'Cero. Nada. Ya bastante caro te salió el iPhone como para que también tengas que pagar por revisar tu banco.'
      },
    ],
    init() {
      let scrollY = 0;
      this.$watch('notifyOpen', open => {
        if (open) {
          scrollY = window.scrollY;
          document.body.style.position = 'fixed';
          document.body.style.top = `-${scrollY}px`;
          document.body.style.left = '0';
          document.body.style.right = '0';
        } else {
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.left = '';
          document.body.style.right = '';
          window.scrollTo(0, scrollY);
        }
      });
      this.$watch('darkMode', val => localStorage.setItem('darkMode', val));
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('darkMode')) {
          this.darkMode = e.matches;
        }
      });
      window.addEventListener('notify:open', () => { this.notifyOpen = true; });
      fetch('https://api.github.com/repos/albertolicea00/BancaRemota')
        .then(r => r.json())
        .then(d => { if (d.stargazers_count !== undefined) this.githubStars = d.stargazers_count; })
        .catch(() => {});
    }
  }
}

// cards: array of {id, light, dark}
// compact: true for the smaller feature-section stacks (tighter fan offsets)
function cardStack(cards, compact = false) {
  const s = compact ? 0.55 : 1  // scale factor for fan offsets
  return {
    cards: [...cards],
    dragging: false,
    dragX: 0, dragY: 0,
    startX: 0, startY: 0,
    flying: false, flyDir: 1,

    init() {
      // Preload images for instantaneous theme switching
      setTimeout(() => {
        this.cards.forEach(card => {
          const imgL = new Image(); imgL.src = card.light;
          const imgD = new Image(); imgD.src = card.dark;
        });
      }, 500);
    },

    fanPos: [
      { r:  0,  x:          0, y:         0, z: 50 },
      { r: -7,  x: -22 * s,   y:  4 * s,    z: 40 },
      { r:  7,  x:  22 * s,   y:  4 * s,    z: 30 },
      { r: -13, x: -40 * s,   y:  8 * s,    z: 20 },
      { r:  13, x:  40 * s,   y:  8 * s,    z: 10 },
    ],

    fanStyle(i) {
      if (i === 0) {
        if (this.dragging) {
          const rot = this.dragX * 0.07
          return `transform:translate(${this.dragX}px,${this.dragY * 0.35}px) rotate(${rot}deg);z-index:50;transition:none;`
        }
        if (this.flying) {
          return `transform:translate(${this.flyDir * 520}px,60px) rotate(${this.flyDir * 28}deg);z-index:50;opacity:0;transition:transform 0.35s ease,opacity 0.3s ease;`
        }
        return `transform:rotate(0deg) translate(0,0);z-index:50;transition:transform 0.45s cubic-bezier(0.34,1.4,0.64,1);`
      }
      // While flying, pre-animate each card one step forward so they're already
      // in position when the array reshuffles — no jump
      const targetIdx = this.flying ? i - 1 : i
      const p = this.fanPos[targetIdx] ?? this.fanPos[this.fanPos.length - 1]
      const z = (this.fanPos[i] ?? this.fanPos[this.fanPos.length - 1]).z
      return `transform:rotate(${p.r}deg) translate(${p.x}px,${p.y}px);z-index:${z};transition:transform 0.35s ease;`
    },

    startDrag(e) {
      if (this.flying) return
      this.dragging = true
      this.startX = e.clientX
      this.startY = e.clientY
      this.dragX = 0; this.dragY = 0
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    drag(e) {
      if (!this.dragging) return
      this.dragX = e.clientX - this.startX
      this.dragY = e.clientY - this.startY
    },
    endDrag() {
      if (!this.dragging) return
      this.dragging = false
      if (Math.abs(this.dragX) > 75) {
        this.flyDir = this.dragX > 0 ? 1 : -1
        this.flying = true
        setTimeout(() => {
          this.cards.push(this.cards.shift())
          this.dragX = 0; this.dragY = 0; this.flying = false
        }, 360)
      } else {
        this.dragX = 0; this.dragY = 0
      }
    },
  }
}

// Pins the feature section on screen (desktop only) and steps through the
// tabs one at a time as the user scrolls, releasing back to normal scroll
// once the last tab has been reached.
//
// Uses manually-toggled fixed/absolute/static positioning instead of
// `position: sticky` — <html>/<body> carry `overflow-x: hidden` (to clip
// decorative blobs sitewide) and ANY ancestor with a non-visible overflow
// disables sticky for all descendants. `position: fixed` isn't affected by
// ancestor overflow, so it works here.
function featureSection() {
  return {
    feat: 'banking',
    _ids: [],
    _onScroll: null,
    init() {
      const mq = window.matchMedia('(min-width: 1024px)');
      const sync = () => mq.matches ? this._pin() : this._unpin();
      mq.addEventListener('change', sync);
      sync();
    },
    _pin() {
      if (this._onScroll) return;
      const buttons = this.$el.querySelectorAll('.feat-btn');
      this._ids = Array.from(buttons).map(btn => btn.dataset.feat);
      const steps = this._ids.length;
      const wrapper = this.$refs.pinWrapper;
      const inner = this.$refs.pinInner;

      wrapper.style.height = `${steps * 25}vh`;
      Object.assign(inner.style, { height: '100vh', display: 'flex', alignItems: 'center' });

      this._onScroll = () => {
        const rect = wrapper.getBoundingClientRect();
        const vh = window.innerHeight;
        const total = rect.height - vh;
        const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
        const idx = Math.min(steps - 1, Math.floor(progress * steps));
        this.feat = this._ids[idx];

        if (rect.top > 0) {
          // Not reached yet — sits in normal flow at the top of the wrapper.
          Object.assign(inner.style, { position: 'static', top: '', left: '', width: '', bottom: '' });
        } else if (rect.bottom <= vh) {
          // Scrolled past — settle at the wrapper's bottom edge, no jump.
          Object.assign(inner.style, { position: 'absolute', top: '', left: '0px', width: '100%', bottom: '0px' });
        } else {
          // Actively pinned — glued to the viewport top.
          Object.assign(inner.style, { position: 'fixed', top: '0px', left: `${rect.left}px`, width: `${rect.width}px`, bottom: '' });
        }
      };
      window.addEventListener('scroll', this._onScroll, { passive: true });
      window.addEventListener('resize', this._onScroll);
      this._onScroll();
    },
    _unpin() {
      if (!this._onScroll) return;
      window.removeEventListener('scroll', this._onScroll);
      window.removeEventListener('resize', this._onScroll);
      this._onScroll = null;
      this.$refs.pinWrapper.style.height = '';
      Object.assign(this.$refs.pinInner.style, {
        position: '', top: '', left: '', width: '', bottom: '',
        height: '', display: '', alignItems: ''
      });
    }
  }
}

function notifyForm() {
  return {
    email: '',
    sent: false,
    loading: false,
    error: '',
    async submit() {
      if (!this.email) return;
      this.loading = true;
      this.error = '';

      try {
        const res = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: this.email })
        });

        if (res.ok) {
          this.sent = true;
        } else {
          this.error = 'Hubo un error al suscribirte. Inténtalo de nuevo.';
        }
      } catch (err) {
        this.error = 'Error de red. Por favor, revisa tu conexión e inténtalo de nuevo.';
      } finally {
        this.loading = false;
      }
    }
  }
}
