import { MlEnv } from "@/components/features/ml/ml-env";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply Medical Leave - Presynce",
  description: "Apply Medical Leave",
};

export default function MlPage() {
  return <MlEnv />;
}
