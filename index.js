const puppeteer = require('puppeteer');
const { Crawler, FlightTypeEnum, PassengerTypeEnum } = require('./crawler.js');

(async () => {
  const browser = await puppeteer.launch({headless: false, args: ['--no-sandbox']});
  const page = (await browser.pages())[0];

  const crawler = new Crawler(page);
  await crawler.start();

  await crawler.selectFlightType(FlightTypeEnum.MULTI_CITY);
  await crawler.setPassengerCount({ [PassengerTypeEnum.ADULTS]: 2 });

  await crawler.fillAirport('origin_airport', 'SAO');
  await crawler.fillAirport('origin_airport', 'London');
  // await crawler.fillAirport('destination_airport', 'VCP');

  // await crawler.fillAirport('origin_airport', 'Rome', 2);
  // await crawler.fillAirport('destination_airport', 'London', 2);

  // await crawler.fillDate(1, 'asd');

//   await browser.close();
})();