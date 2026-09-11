import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0284C7" />
        <meta name="apple-itunes-app" content="app-id=6744923279" />
        <meta
          name="description"
          content="Scan QR codes, collect loyalty stamps, and unlock rewards at local businesses."
        />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <style>{`
          html, body {
            height: 100%;
            width: 100%;
            max-width: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
            overscroll-behavior: none;
            -webkit-text-size-adjust: 100%;
            text-size-adjust: 100%;
            background-color: #F0F9FF;
          }
          html {
            height: 100dvh;
          }
          body > div:first-child {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            height: 100%;
            width: 100%;
            max-width: 100%;
            overflow: hidden;
          }
          * {
            box-sizing: border-box;
          }
          input, textarea, select {
            font-size: 16px;
          }
          button, [role="button"], a {
            touch-action: manipulation;
          }
        `}</style>
        <ScrollViewStyleReset />
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-659661162" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-659661162');
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
