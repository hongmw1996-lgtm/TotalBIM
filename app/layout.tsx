import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'IFC BIM Viewer',
  description: 'IFC workflows for production review.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
      </body>
    </html>
  );
}
