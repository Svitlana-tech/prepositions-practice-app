/** A spinning ring shown while something loads, centered in the space below the page top. */
export function Spinner() {
  return (
    <div className="flex justify-center py-24" role="status" aria-label="Loading">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-solid motion-reduce:animate-none"
        style={{ borderColor: "#E3F2FD", borderTopColor: "#1565C0" }}
      />
    </div>
  );
}
