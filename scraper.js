import https from "https";

https.get(
  "https://www.realestate.com.au/buy/in-sydney,+nsw+2000/list-1",
  (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      console.log(data.substring(0, 5000));
    });
  }
);
