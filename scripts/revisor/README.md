# El revisor

Recorre cada pantalla de la app en modo demo y falla si algo no se puede usar. Nació el 27 oct 2026, el día que «Tus datos de nacimiento» no bajaba, «Guardar cambios» quedaba fuera de la pantalla y nos enteramos por los reclamos.

**Cuándo corre:**
- En cada publicación, dentro de `verify` (`.github/workflows/deploy.yml`). Si encuentra algo, la publicación se detiene.
- En el chequeo local completo: paso 7 de `scripts/herramientas/chequeo-seis-capas.sh`.

**Qué revisa:** cada pantalla en tres tamaños (celular chico 360×640, celular 390×844 y computador 1440×800), con cuatro personas de ejemplo:
- alguien que recién llega;
- alguien con hora de nacimiento;
- alguien sin hora;
- alguien sin ciudad ni fecha.

En cada pantalla mira:
- **no-se-alcanza:** un botón, enlace o campo al que una persona no puede llegar desplazando. Solo cuenta lo que una persona puede mover (`overflow: auto` o `scroll`). El navegador automático también puede mover cajas con `overflow: hidden`, y por eso al principio no veía la falla del 27 oct.
- **tapado:** algo que queda debajo de otra cosa, por ejemplo una barra fija o un aviso. Antes de marcarlo, prueba dejarlo arriba, al medio y abajo, como haría una persona.
- **más ancha que la pantalla:** la página se corre de lado.
- **error en la consola:** un error de la página.

Además hace recorridos con acciones: escribir una ciudad y abrir la lista, y abrir «Necesito ayuda», «Sugerir» y «Pregúntale a tu carta».

**Cómo se usa:**
```
pnpm revisar
```
Arma la app en modo demo (`dist-revisor/`), la sirve y la recorre. Variables:
- `CHROMIUM`: un Chromium ya instalado; en la nube, `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- `SOLO=/perfil/nacimiento`: revisa una sola ruta.
- `SALIDA`: dónde quedan `informe.json` y las capturas de lo que falló.

**Si algo se marca a propósito** (por ejemplo, un velo que tapa todo mientras una ventana está abierta), se agrega a `permitidos.json` con `ruta`, `tamano`, `tipo` y `elemento`, y con el motivo en la conversación del commit. Antes de permitirlo, se mira: lo normal es que sea un error de verdad.

**Archivos:**
- `revisar.mjs`: el revisor.
- `revisar.sh`: arma la app, la sirve y corre el revisor.
- `carta-de-ejemplo.json`: la carta de Francisca, la persona de las semillas.
- `permitidos.json`: lo marcado a propósito.

Las semillas vienen de `scripts/herramientas/semillas/`. El revisor les renueva la fecha de vencimiento, porque las sesiones sin cuenta caducan a los 7 días.

**Cómo se comprobó que sirve (27 oct):** se volvieron a meter, a propósito, las dos fallas de ese día:
- el formulario de nacimiento que no bajaba;
- «Ver mi carta completa» fuera de alcance en un computador de 800 px de alto.

El revisor marcó las dos y terminó con código 1. La segunda la encontró el mismo revisor la primera vez que corrió.
