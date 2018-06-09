const { PendingXHR } = require('pending-xhr-puppeteer');

const FlightTypeEnum = Object.freeze({
    ROUND_TRIP: 1,
    ONE_WAY: 2,
    MULTI_CITY: 3,
});

const PassengerTypeEnum = Object.freeze({
    ADULTS: 1,
    CHILDREN: 2,
    INFANT_SEAT: 3,
    INFANT_LAP: 4,
});

class Crawler {

    constructor(browser, page) {
        this.browser = browser;
        this.page = page;
        this.pendingXHR = new PendingXHR(this.page);
    }

    async start(i = 0) {
        try {
            await this.page.goto('https://www.google.com/flights'
            );
            // , { waitUntil: 'networkidle2' });
            // await new Promise(r => setTimeout(r, 100));
            // await this.page.waitFor('[data-flt-ve="country"]');
            // await this.page.evaluate(() => Array.from(document.querySelectorAll('[data-flt-ve="country"]')).find(e => ['brazil', 'brasil'].indexOf(e.textContent.trim().toLowerCase())  > -1).click());
        } catch (ex) {
            console.log('Couldn\'t start browser', ex);
            if (i < 4) {
                console.log(`Retrying #${i}...`);
                await this.start(i + 1);
            } else {
                throw ex;
            }
        }
    }

    async search() {
        await this.page.evaluate(() => document.querySelector('.gws-flights-form__search-button-wrapper floating-action-button').click());
        await Promise.all([
            new Promise(r => setTimeout(r, 5000)),
            this.page.waitFor('.gws-flights-results__slice-results-desktop ol li'),
            this.pendingXHR.waitForAllXhrFinished(),
        ]);
        return await this.page.evaluate(async () => {
            const extract = (line, selector) => line.querySelector(selector) ? line.querySelector(selector).textContent.trim() : null;
            const extractFlights = lis => lis
                .map(li => li.querySelector('.gws-flights-results__itinerary.gws-flights-results__collapsed-itinerary'))
                .filter(e => e)
                .map(line => ({
                    time: extract(line, '.gws-flights-results__itinerary-times'),
                    duration: extract(line, '.gws-flights-results__itinerary-duration'),
                    stops: extract(line, '.gws-flights-results__itinerary-stops'),
                    price: extract(line, '.gws-flights-results__itinerary-price'),
                }));

            const lis = Array.from(document.querySelectorAll('.gws-flights-results__slice-results-desktop ol li'));
            return extractFlights(lis);
        });
    }

    async follow(index) {
        await this.page.waitForFunction(`document.querySelectorAll('.gws-flights-results__slice-results-desktop ol li .gws-flights-results__itinerary.gws-flights-results__collapsed-itinerary').length > ${index}`);
        await this.page.evaluate(index => document.querySelectorAll('.gws-flights-results__slice-results-desktop ol li .gws-flights-results__itinerary.gws-flights-results__collapsed-itinerary')[index].click(), index);
        await this.page.waitForFunction(() => {
            const ol = document.querySelectorAll('.gws-flights__selection-bar.gws-flights__scrollbar-padding ol.gws-flights-results__breadcrumbs.gws-flights__flex-box.gws-flights__align-center')[0];
            const idx = Array.from(ol.querySelectorAll('li')).findIndex(el => el.classList.contains('gws-flights-results__breadcrumb-active'));
            return idx > 0;
        });
        await Promise.all([
            new Promise(r => setTimeout(r, 5000)),
            this.pendingXHR.waitForAllXhrFinished(),
        ]);
        const result = await this.page.waitForFunction(() => {
            if (document.querySelectorAll('ol.gws-flights-results__result-list li').length > 0) {
                return 1;
            }
            if (document.querySelectorAll('[data-flt-ve="no_results"]').length > 0) {
                return -1;
            }
            return false;
        });
        if (result === -1) {
            return []; // empty result
        }
        return await this.page.evaluate(() => {
            const extract = (line, selector) => line.querySelector(selector) ? line.querySelector(selector).textContent.trim() : null;
            const extractFlights = lis => lis
                .map(li => li.querySelector('.gws-flights-results__itinerary.gws-flights-results__collapsed-itinerary'))
                .filter(e => e)
                .map(line => ({
                    time: extract(line, '.gws-flights-results__itinerary-times'),
                    duration: extract(line, '.gws-flights-results__itinerary-duration'),
                    stops: extract(line, '.gws-flights-results__itinerary-stops'),
                    price: extract(line, '.gws-flights-results__itinerary-price'),
                }));

            const children = Array.from(document.querySelectorAll('ol.gws-flights-results__result-list li'));
            return extractFlights(children);
        });
    }

    async fillDate(order, date) {
        const line = `.gws-flights-form__form-content [data-flt-ve="multi_city_summary"] jsl:nth-child(${order})`;
        const selector = `${line} [data-flt-ve="departure_date"]`;
        await this.page.waitFor(selector);
        await this.page.click(selector);
        await this.page.evaluate(selector => {
            document.querySelector(selector).click();
        }, selector);
        await new Promise(r => setTimeout(r, 300));
        await this.page.waitFor('#flt-modaldialog date-input input');
        await new Promise(r => setTimeout(r, 300));
        await this.page.type('#flt-modaldialog date-input input', date);
        await this.page.type('#flt-modaldialog date-input input', String.fromCharCode(13));
        await this.page.click('#flt-modaldialog g-raised-button');
    }

    async fillAirport(input, iata, order = 1) {
        const line = `.gws-flights-form__form-content [data-flt-ve="multi_city_summary"] jsl:nth-child(${order})`;
        const selector = `${line} [data-flt-ve="${input}"]`;
        await this.page.waitFor(selector);
        await this.page.evaluate(selector => {
            document.querySelector(`${selector} *`).click();
        }, selector);
        await this.page.waitFor('#flt-modalunderlay');
        await new Promise(r => setTimeout(r, 300));
        await this.page.waitFor('#flt-modaldialog input[type=text]');
        await this.page.click('#flt-modaldialog input[type=text]');
        await this.page.evaluate(() => document.querySelector('#flt-modaldialog input[type=text]').value = '');
        await this.page.type('#flt-modaldialog input[type=text]', iata);
        await new Promise(r => setTimeout(r, 300));
        await this.page.waitFor('destination-picker [role=listbox] li');
        await this.page.click('#flt-modaldialog input');
        await this.page.type('#flt-modaldialog input', String.fromCharCode(13));
    }

    /// Pass in a [FlightTypeEnum] value
    async selectFlightType(flightTypeEnum) {
        await this.page.click('[data-flt-ve=ticket_type_selector] span');
        await this.page.click(`[role=menu] menu-item:nth-child(${flightTypeEnum})`);
    }

    /// e.g. setPassengerCount({ [PassengerTypeEnum.ADULTS]: 2 })
    async setPassengerCount(countMap) {
        await this.page.click('[data-flt-ve=passengers_selector] div');
        await this.page.waitFor('.gws-flights-dialog__passenger-dialog > div');
        for (let type of Object.values(PassengerTypeEnum)) {
            const desiredAmount = countMap[type] || 0;
            const currentAmount = await this.page.evaluate(type => document.querySelector(`.gws-flights-dialog__passenger-dialog > div > div:nth-child(${type}) .gws-flights-dialog__flipper-value`).textContent, type);

            const buttonSelect = action => `.gws-flights-dialog__passenger-dialog > div > div:nth-child(${type}) [role=presentation] > div:nth-child(${action})`;
            if (currentAmount < desiredAmount) {
                const increaseButton = buttonSelect(3);
                for (let i = 0; i < (desiredAmount - currentAmount); i++) {
                    await this.page.evaluate(btn => document.querySelector(btn).click(), increaseButton);
                }
            } else if (currentAmount > desiredAmount) {
                const decreaseButton = buttonSelect(1);
                for (let i = 0; i < (currentAmount - desiredAmount); i++) {
                    await this.page.evaluate(btn => document.querySelector(btn).click(), decreaseButton);
                }
            }
        }

        await this.page.waitFor('.gws-flights__dialog-button-container .gws-flights__dialog-primary-button');
        await new Promise(r => setTimeout(r, 250));
        await this.page.click('.gws-flights__dialog-button-container .gws-flights__dialog-primary-button');
    }
}

module.exports = { Crawler, FlightTypeEnum, PassengerTypeEnum };
