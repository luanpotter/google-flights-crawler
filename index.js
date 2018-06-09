const puppeteer = require('puppeteer');
const moment = require('moment');
const product = require('cartesian-product');

const { Crawler, FlightTypeEnum, PassengerTypeEnum } = require('./crawler.js');

const fs = require('fs');
const { promisify } = require('util');

const writeFile = promisify(fs.writeFile);

const fileName = process.argv[2];
const data = JSON.parse(process.argv[3]);

const setup = async (crawler, { startDate, endDate, city1, city2 }) => {
  await crawler.start();

  await crawler.selectFlightType(FlightTypeEnum.MULTI_CITY);
  await crawler.setPassengerCount({ [PassengerTypeEnum.ADULTS]: 2 });

  await crawler.fillAirport('origin_airport', 'SAO');
  await crawler.fillAirport('destination_airport', city1);

  await crawler.fillAirport('origin_airport', city2, 2);
  await crawler.fillAirport('destination_airport', 'SAO', 2);

  await crawler.fillDate(1, startDate.format('YYYY-MM-DD'));
  await crawler.fillDate(2, endDate.format('YYYY-MM-DD'));
}

const crawl = async (crawler, req) => {
  const results = [];

  for (let i = 1; ; i++) {
    console.log(`+ Following ${i}`);

    console.log('++ Setup');
    await setup(crawler, req);

    console.log('++ Search');
    const firstHalfs = await crawler.search();

    const firstHalf = firstHalfs[i];
    if (!firstHalf) {
      console.log('++ Final entry found!');
      break;
    }

    console.log(`++ Follow ${i}/${firstHalfs.length}`);
    const secondHalfs = await crawler.follow(i);
    console.log(`++ Fetch (found ${secondHalfs.length})`);
    secondHalfs.forEach(secondHalf => results.push({ firstHalf, secondHalf }));
  }

  return results;
};

const tryCrawl = async (crawler, req) => {
  while (true) {
    try {
      return await crawl(crawler, req);
    } catch (ex) {
      console.log('error: ', ex);
      await new Promise(r => setTimeout(r, 500));
      console.log('Retrying...');
    }
  }
}

(async () => {
  const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']});
  const page = (await browser.pages())[0];
  const crawler = new Crawler(page);

  const firstDate = moment(data.firstDate);
  const lastDate = moment(data.lastDate);
  const { cityPairs } = data;

  const dates = [];
  let currentDate = moment(firstDate);
  while (!currentDate.isAfter(lastDate)) {
    dates.push(currentDate);
    currentDate = moment(currentDate).add(+1, 'day');
  }
  
  const results = [];
  const datePairs = product([dates, dates]).filter(pair => pair[0].isBefore(pair[1]));
  for (let [ city1, city2] of cityPairs) {
    for (let [ startDate, endDate ] of datePairs) {
      const req = { startDate, endDate, city1, city2 };
      console.log(`Running for ${JSON.stringify(req)}`);
      const resp = await tryCrawl(crawler, req);
      results.push({ req, resp });
    }
  }

  await browser.close();
  await writeFile(fileName, JSON.stringify(results));
})();
