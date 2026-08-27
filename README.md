# Generador de Códigos QR

Generador de códigos QR estáticos: la información queda grabada directamente en la imagen, sin servidor ni base de datos. 100% en tu navegador.

**URL pública:** https://trapixdev.github.io/codigos-qr/

## Características

- **Tipos de contenido:** URL, texto libre, credenciales WiFi y tarjetas de contacto vCard.
- **Corrección de errores (ECC):** L (7%), M (15%), Q (25%) y H (30%). Seleccionar "Incrustar logo" fuerza ECC H para compensar los módulos tapados.
- **Logo central:** sube una imagen (PNG, JPG o SVG, máx 2 MB) y se centra sobre el código.
- **Salida:**
  - PNG (pantalla, 256–1024 px).
  - SVG vectorial (imprenta).
  - Copiar el payload generado (útil para WiFi/vCard).
- **Validación:** URL bien formada y control de capacidad del QR según el nivel ECC elegido.
- **Tema claro/oscuro:** sigue al sistema o se fuerza con el botón del encabezado (persistente).
- Responsive, accesible (tabs ARIA, foco visible por teclado) y en español.

## Stack

- Vanilla JavaScript + HTML/CSS, sin build step.
- Librería [`qrcode`](https://github.com/soldair/node-qrcode) v1.5.1 vía CDN.
- Desplegado en GitHub Pages.

## Uso

1. Abre la app y elige el tipo de contenido (URL, Texto, WiFi o vCard).
2. Completa los campos y ajusta ECC y tamaño.
3. Opcional: incrusta un logo en el centro.
4. Descarga el QR en PNG o SVG, o copia el payload.

## Despliegue

Alojado en GitHub Pages (rama `main`, carpeta raíz). Sin build: los cambios se publican con solo hacer push.

## Limitaciones

- Códigos **estáticos**: si la URL destino cambia, el QR queda obsoleto y hay que regenerarlo (los códigos dinámicos con redirección requieren backend).
- La librería QR se carga desde CDN, por lo que se necesita conexión para generar códigos.