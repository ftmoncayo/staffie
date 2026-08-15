function RichTextContent({ html }) {
  if (!html) return null

  return (
    <div
      className="text-text [&_hr]:my-4 [&_hr]:border-border [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export default RichTextContent
