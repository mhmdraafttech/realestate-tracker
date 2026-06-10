async function run() {
  const response = await fetch(
    "https://www.realestate.com.au/buy/in-sydney,+nsw+2000/list-1",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137.0.0.0 Safari/537.36",
      },
    }
  );

  const html = await response.text();

  console.log("HTML LENGTH:", html.length);

  console.log(
    "Contains listing_search_results:",
    html.includes("listing_search_results")
  );

  console.log(
    "Contains BuySearchResultsItem:",
    html.includes("BuySearchResultsItem")
  );
}

run().catch(console.error);
