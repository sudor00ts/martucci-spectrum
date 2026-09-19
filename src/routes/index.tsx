import { createFileRoute } from "@tanstack/react-router";
import { AnalyzerApp } from "@/components/analyzer/AnalyzerApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <AnalyzerApp />;
}
