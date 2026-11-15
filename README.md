# ¿Hoy es feriado? 🇦🇷

[![Sitio en vivo](https://img.shields.io/badge/sitio-en%20vivo-6b46c1)](https://esferiadohoy.vercel.app)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**¿Hoy es feriado en Argentina?** Sitio web gratuito que responde esa
pregunta al instante, con letra grande y sin vueltas: si hoy es
**feriado en Argentina**, cuál es, y cuánto falta para el próximo. Incluye
además el **calendario completo de feriados** del año en curso.

## Usarlo

No hay que instalar nada — es una página web. Entrá directo a:

### 👉 [esferiadohoy.vercel.app](https://esferiadohoy.vercel.app)

Funciona igual en el celular que en la computadora.

## Preguntas frecuentes

**¿Necesito crear una cuenta?**
No, no hay cuentas, ni login, ni nada parecido.

**¿Manda mis datos a algún lado?**
No. El sitio no pide ni guarda ningún dato tuyo: no usa cookies, analítica
ni rastreadores, y no carga nada de otros sitios en tu navegador. Como
cualquier página web, el hosting (Vercel) registra los accesos. Para
responderte, el servidor solo consulta una fuente pública de feriados.

**¿De dónde sale la información?**
De [ArgentinaDatos](https://argentinadatos.com/docs/operations/get-feriados),
una fuente pública y gratuita de datos abiertos de Argentina — se actualiza
sola una vez por día.

**¿Es gratis?**
Sí, y no tiene publicidad ni ningún costo oculto.

## Para desarrolladores

Requisitos: [Node.js](https://nodejs.org/) 22+.

```bash
git clone https://github.com/malenitaa/esferiadohoy.git
cd esferiadohoy
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). Para correr los tests,
`npm test`.

Las decisiones de diseño están en [`docs/adr/`](docs/adr/INDICE.md) y cómo
reportar un problema de seguridad, en [SECURITY.md](SECURITY.md).

## ¿Te sirvió?

Si te resultó útil y querés bancar el proyecto:

- [Cafecito](https://cafecito.app/rezamalena)
- [Ko-fi](https://ko-fi.com/malenitaa)

## Licencia

MIT — ver [LICENSE](LICENSE).
