export async function generateContent({
  imageFile,
  produceName,
  farmName,
  tone
}) {

  const base64Image = await fileToBase64(imageFile)

  const response = await fetch("http://localhost:3001/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      image: base64Image,
      produceName,
      farmName,
      tone
    })
  })

  if (!response.ok) {
    throw new Error("API error")
  }

  return await response.json()
}

function fileToBase64(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader()

    reader.readAsDataURL(file)

    reader.onload = () => resolve(reader.result)

    reader.onerror = error => reject(error)

  })
}