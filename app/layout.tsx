/* eslint-disable @next/next/no-head-element */
import '../styles/globals.css';
import AuthContext from './AuthContext';
import ShowSession from './mysession';
import ThemeProvider from "./components/themeProvider";
import { cookies } from 'next/headers'
import Themes from '../lib/themes'
import { headers } from 'next/headers'
import { Roboto, Roboto_Mono } from 'next/font/google'

const roboto = Roboto({
    weight: ['400', '500', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-roboto',
})

const robotoMono = Roboto_Mono({
    weight: ['400', '500'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-roboto-mono',
})

export default async function RootLayout({ children, }: React.PropsWithChildren) {

  const themeCookieStore = await cookies()
  const themeCookie = themeCookieStore.get('theme')
  const currentTheme = themeCookie ? themeCookie.value : Themes[0]

  const headersList = await headers()
  const rewritten = headersList.get('middleware-rewritten')
  const path = headersList.get('next-url')

  const showChrome = rewritten == null && !path?.includes('/posts')

  return (
    <html data-theme={currentTheme} className={`${roboto.variable} ${robotoMono.variable} ${currentTheme === 'dark' ? 'dark' : ''}`}>
      <head></head>
      <body className="bg-base-100 min-h-screen font-sans text-base-content">
          <AuthContext>
            {showChrome && <ShowSession theme={currentTheme} />}

            <main className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 py-8">
              {children}
            </main>

            {showChrome && (
              <div className="fixed bottom-4 right-4 z-40">
                <ThemeProvider />
              </div>
            )}
          </AuthContext>
      </body>
    </html>
  );
}
