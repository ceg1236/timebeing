export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>
}) {
  const { name } = await searchParams

  return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center">
      <h1 className="text-3xl font-medium tracking-tight">You&rsquo;re booked{name ? `, ${name}` : ''}!</h1>
      <p className="mt-4 text-black/70">
        A confirmation email is on its way. We can&rsquo;t wait to see you.
      </p>
    </div>
  )
}
