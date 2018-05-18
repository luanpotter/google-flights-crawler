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

    constructor(page) {
        this.page = page;
    }

    async start() {
        await this.page.goto('https://www.google.com/flights');
    }

    async fillDate(order, date) {
        const line = `.gws-flights-form__form-content [data-flt-ve="multi_city_summary"] jsl:nth-child(${order})`;
        const selector = `${line} [data-flt-ve="departure_date"]`;
        await this.page.waitFor(selector);
        await this.page.click(selector);
        await this.page.evaluate(selector => {
            document.querySelector(selector).click();
        }, selector);
        await this.page.waitFor('#flt-modaldialog date-input input');
        await this.page.type('#flt-modaldialog date-input input', '2018-07-07');
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
        await this.page.waitFor('#flt-modaldialog input');
        await this.page.click('#flt-modaldialog input');
        await this.page.type('#flt-modaldialog input', iata);
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

            const buttonSelect = action => `.gws-flights-dialog__passenger-dialog > div > div:nth-child(${type}) [role=region] > div:nth-child(${action})`;
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
