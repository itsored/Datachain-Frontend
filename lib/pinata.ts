export async function pinJSONToIPFS(json: any) {
  const res = await fetch("/api/pinata", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(json),
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || "Failed to pin JSON to IPFS")
  }

  const data = await res.json()
  return data.IpfsHash as string
}

export async function pinFileToIPFS(file: File) {
  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch("/api/pinata/file", {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || "Failed to pin file to IPFS")
  }

  const data = await res.json()
  return data.IpfsHash as string
} 