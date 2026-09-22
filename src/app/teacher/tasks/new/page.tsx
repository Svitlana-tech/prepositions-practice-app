import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TASK_TYPES } from "@/lib/taskTypes";

/** Step 1 of adding a question: pick the type. Topics come next, inside the chosen type. */
export default function NewTaskPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">New Question — Choose a Type</h1>
      <p className="mb-6 text-sm text-gray-500">
        Pick the kind of exercise first. On the next screen you choose which of that type&apos;s
        topics the question belongs to.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {TASK_TYPES.map((t) =>
          t.available ? (
            <Link key={t.type} href={t.newHref}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="mb-1 font-medium text-gray-900">{t.label}</div>
                <div className="text-sm text-gray-500">{t.description}</div>
              </Card>
            </Link>
          ) : (
            <Card key={t.type} className="h-full opacity-50">
              <div className="mb-1 font-medium text-gray-900">{t.label}</div>
              <div className="text-sm text-gray-500">{t.description}</div>
              <div className="mt-2 text-xs font-medium text-gray-400">Coming soon</div>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
