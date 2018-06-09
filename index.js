const puppeteer = require('puppeteer');
const moment = require('moment');
const product = require('cartesian-product');
const Pool = require("generic-pool");

const { Crawler, FlightTypeEnum, PassengerTypeEnum } = require('./crawler.js');
const { save } = require('./storage.js');

const dir = process.argv[2]; // directory name to save all the results in
const threads = parseInt(process.argv[3]); // number of threads to start

/// input generator; format:
/// { firstDate, lastDate, cityPairs })
/// dates are 'YYYY-MM-DD' and cityPairs is an matrix of nx2 strings representing (3-letter) IATAs
/// This will crawl every combination of dates between first and last (inclusive), for routes on the cityPairs provided
const data = JSON.parse(process.argv[4]);

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

const crawl = async (logger, crawler, req) => {
  const results = [];

  for (let i = 1; ; i++) {
    logger.log(`+ Following ${i}`);

    logger.log('++ Setup');
    await setup(crawler, req);

    logger.log('++ Search');
    const firstHalfs = await crawler.search();

    const firstHalf = firstHalfs[i];
    if (!firstHalf) {
      logger.log('++ Final entry found!');
      break;
    }

    logger.log(`++ Follow ${i}/${firstHalfs.length}`);
    const secondHalfs = await crawler.follow(i);
    logger.log(`++ Fetch (found ${secondHalfs.length})`);
    secondHalfs.forEach(secondHalf => results.push({ firstHalf, secondHalf }));
  }

  return results;
};

const tryCrawl = async (logger, crawler, req) => {
  let i = 0;
  while (true) {
    try {
      return await crawl(logger, crawler, req);
    } catch (ex) {
      logger.log(`error: ${ex} (this is the ${++i}-th time)`);
      logger.log(`${JSON.stringify(ex)}`);
      if (i > 10) {
        logger.log('Just giving up, man...');
        return 'We gave up after 10 tries...';
      }
      await new Promise(r => setTimeout(r, 500));
      logger.log('Retrying...');
    }
  }
}

const generate = data => {
  const firstDate = moment(data.firstDate);
  const lastDate = moment(data.lastDate);
  const { cityPairs } = data;

  const dates = [];
  let currentDate = moment(firstDate);
  while (!currentDate.isAfter(lastDate)) {
    dates.push(currentDate);
    currentDate = moment(currentDate).add(+1, 'day');
  }
  const datePairs = product([dates, dates]).filter(pair => pair[0].isBefore(pair[1]));
  
  const reqs = [];
  for (let [ city1, city2] of cityPairs) {
    for (let [ startDate, endDate ] of datePairs) {
      const req = { startDate, endDate, city1, city2 };
      reqs.push(req);
    }
  }

  return reqs;
};

const createPool = () => {
  let i = 0;
  const factory = {
    create: async () => {
      const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=pt-BR']});
      const page = (await browser.pages())[0];
      const crawler = new Crawler(browser, page);
      crawler.id = i++;
      return crawler;
    },
    destroy: async crawler => {
      await crawler.browser.close();
    }
  };

  return Pool.createPool(factory, { max: threads });
};

(async () => {
  console.log(`Setting up ${threads} threads...`);
  const pool = createPool();
  const reqs = generate(data);

  console.log(`Generated ${reqs.length} reqs; saving...`);
  await save(`${dir}/inputs`, reqs);

  console.log('Saved. Starting...');
  await Promise.all(reqs.map(async (req, i) => {
    const crawler = await pool.acquire();
    const logger = { log: (str) => console.log(`[thread-${crawler.id}](${i}) ${str}`) };
    logger.log(`Starting ${JSON.stringify(req)}`);
    const resp = await tryCrawl(logger, crawler, req);
    const result = { req, resp };
    logger.log(`Finished; saving file.`);
    await save(`${dir}/result-${i}`, result);
    logger.log(`Saved.`);
    pool.release(crawler);
  }));

  await pool.drain();
  await pool.clear();
})();
