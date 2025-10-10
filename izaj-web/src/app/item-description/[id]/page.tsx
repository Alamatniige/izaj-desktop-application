"use client";
import React from 'react';
import ItemDescription from '@/components/pages/item-description/page';

interface PageProps { params: Promise<{ id: string }> }

export default function Page({ params }: PageProps) {
  const resolvedParams = React.use(params);
  return <ItemDescription params={resolvedParams} />;
}


