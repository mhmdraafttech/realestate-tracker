async function run() {
  const response = await fetch(
    "https://www.realestate.com.au/buy/in-sydney,+nsw+2000/list-1",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36",
      },
    }
  );

  const html = await response.text();

  const start = html.indexOf('"id":"148401960"');

  console.log(
    html.substring(start - 500, start + 5000)
  );
}

run().catch(console.error);
