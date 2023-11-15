import 'tailwindcss/tailwind.css'

/* https://stackoverflow.com/questions/51905803/next-js-how-to-change-css-of-root-div-next-on-specific-page */
import './lib/global.css';

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

export default MyApp
