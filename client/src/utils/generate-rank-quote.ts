export function generateRankQuote(rank: number): string {
  const quotes = {
    champion: [
  "Birkaç oyun kazanmak yetmez!",
  "Sahayı fethettin — gerçek bir Kulüp Şampiyonu.",
  "Zafer peşini bırakmıyor. Kulüp Şampiyonu sonsuza dek.",
    ],
    elite: [
  "Elit bir Aday — rallilerin hareketli bir şiir gibi.",
  "Zerafet ve güç — gerçek bir Elit Aday’ın imzası.",
  "Tahta sadece bir adım var. Devam et, Elit Aday.",
    ],
    veteran: [
  "Tecrübeli bir Oyuncu — pişmiş, keskin, baskıda bile sağlam.",
  "Masada bilgelik, serviste güç — Tecrübeli Oyuncu parlıyor.",
  "Her şeyi gördün. Fırtınada bile sakin el — Tecrübeli Oyuncu.",
    ],
    challenger: [
  "Hâlâ Aday — her maç ihtişama atılan bir adım.",
  "Bugün Aday, yarın Şampiyon. Keskin kal.",
  "Yolculuğun daha yeni başladı — raketi kap, hazır ol.",
    ],
  };

  const pickRandom = (arr: string[]) =>
    arr[Math.floor(Math.random() * arr.length)];

  if (rank <= 5) return pickRandom(quotes.champion);
  if (rank <= 10) return pickRandom(quotes.elite);
  if (rank <= 20) return pickRandom(quotes.veteran);
  return pickRandom(quotes.challenger);
}
