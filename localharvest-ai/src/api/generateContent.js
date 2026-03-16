export async function generateContent({
  imageFile,
  produceName,
  farmName,
  tone
}) {

  const { base64, mediaType } = await fileToBase64(imageFile)

  const response = await fetch("/api/generate-content", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      imageBase64: base64,
      imageMediaType: mediaType,
      produceName,
      farmName,
      tone
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "API error" }))
    throw new Error(err.error || "API error")
  }

  return await response.json()
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const dataUrl = reader.result
      // dataUrl is "data:<mediaType>;base64,<data>"
      const [meta, base64] = dataUrl.split(",")
      const mediaType = meta.replace("data:", "").replace(";base64", "")
      resolve({ base64, mediaType })
    }
    reader.onerror = error => reject(error)
  })
}
