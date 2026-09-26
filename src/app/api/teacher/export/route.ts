import { NextRequest } from "next/server";
import { buildTasksDocx } from "@/lib/wordExport";

/** Protected (middleware): download the task bank as a Word file. `?categoryId=` limits it to one topic. */
export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get("categoryId") || undefined;
  const { buffer, fileName } = await buildTasksDocx(categoryId);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
