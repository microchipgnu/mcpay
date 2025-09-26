'use client';

import React from 'react';

interface BuildLayoutProps {
  children: React.ReactNode;
}

export default function BuildLayout({ children }: BuildLayoutProps) {
  return (
    // absolute inset under the navbar (adjust `top-16` to your navbar height)
    <div className="flex flex-col absolute inset-x-0 top-[3.5rem] bottom-0 overflow-hidden">
      {children}
    </div>
  );
}
