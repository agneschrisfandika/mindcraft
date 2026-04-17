export async function generateAIResponse(prompt, type = "quiz") {
    try {
        // Cek apakah running di server
        const isLocal = location.protocol === "file:";

        if (isLocal) {
            console.warn("Running in local mode → pakai fallback AI");
            return fallbackAI(prompt, type);
        }

        const response = await fetch("/api/ai", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ prompt, type })
        });

        if (!response.ok) throw new Error("API error");

        const data = await response.json();
        return data.result;

    } catch (error) {
        console.error("AI Error:", error);
        return fallbackAI(prompt, type);
    }
}
function fallbackAI(prompt, type) {
    if (type === "quiz") {
        return generateDummyQuiz(prompt);
    }

    if (type === "summary") {
        return "Ringkasan:\n" + prompt.slice(0, 200) + "...";
    }

    return "AI sedang offline, menampilkan hasil sederhana.";
}
function generateDummyQuiz(text) {
    const questions = [];

    for (let i = 1; i <= 5; i++) {
        questions.push({
            question: `Apa inti dari materi berikut (${i})?`,
            options: [
                "Konsep utama",
                "Penjelasan detail",
                "Contoh kasus",
                "Kesimpulan"
            ],
            answer: 0
        });
    }

    return questions;
}