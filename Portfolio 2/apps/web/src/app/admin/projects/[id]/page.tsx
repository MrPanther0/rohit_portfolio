'use client';

import { useParams } from 'next/navigation';
import { ProjectEditor } from '@/components/admin/ProjectEditor';

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  return <ProjectEditor projectId={params.id} />;
}
