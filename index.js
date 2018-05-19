const puppeteer = require('puppeteer');
const moment = require('moment');
const product = require('cartesian-product');
const { Crawler, FlightTypeEnum, PassengerTypeEnum } = require('./crawler.js');

const crawl = async (crawler, start, end) => {
  await crawler.start();

  await crawler.selectFlightType(FlightTypeEnum.MULTI_CITY);
  await crawler.setPassengerCount({ [PassengerTypeEnum.ADULTS]: 2 });

  await crawler.fillAirport('origin_airport', 'SAO');
  await crawler.fillAirport('destination_airport', 'FCO');

  await crawler.fillAirport('origin_airport', 'LCY', 2);
  await crawler.fillAirport('destination_airport', 'SAO', 2);

  await crawler.fillDate(1, start);
  await crawler.fillDate(2, end);

  return await crawler.search();
};

(async () => {
  const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox']});
  const page = (await browser.pages())[0];
  const crawler = new Crawler(page);

  const startDate = moment('2019-02-11');
  const endDate = moment('2019-03-01');

  const dates = [];
  let currentDate = moment(startDate);
  while (!currentDate.isAfter(endDate)) {
    dates.push(currentDate);
    currentDate = moment(currentDate).add(+1, 'day');
  }
  
  const datePairs = product([dates, dates]).filter(pair => pair[0].isBefore(pair[1]));
  for (let [ startDate, endDate ] of datePairs) {
    const start = startDate.format('YYYY-MM-DD');
    const end = endDate.format('YYYY-MM-DD');

    console.log('------------');
    console.log(start + ' > ' + end);

    let results = null;
    while (!results) {
      try {
        results = await crawl(crawler, start, end);
      } catch (ex) {
        console.log('error: ', ex);
      }
    }
  
    console.log(results);
    console.log('------------');
  }

  await browser.close();
})();