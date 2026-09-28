import { SubjectDetailEnv } from "@/components/features/lab/semester/subject-detail-env";

export default async function SubjectDetailPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const resolvedParams = await params;
  return <SubjectDetailEnv subjectId={resolvedParams.subjectId} />;
}
