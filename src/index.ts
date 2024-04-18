require('dotenv').config()
const { chromium } = require('playwright');
const data = require('../data/request.json');
const fs = require('node:fs');

const resultList: resultRecord[] = []

const lookup = async (requestItem: requestItem) => {
    const browser = await chromium.launch({
        headless: false
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('https://brightspace.cuny.edu');
    await page.getByLabel('Username').fill(process.env.USERNAME);
    await page.getByLabel('Username').press('Tab');
    await page.getByLabel('Password').fill(process.env.PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    try {
        console.log(`Processing copy request for: ${requestItem.course} (${requestItem.cf_course_id}/${requestItem.cf_term_id})`);
        await page.goto(`https://brightspace.cuny.edu/d2l/home/${requestItem.org_id}`);
        await page.getByRole('button', { name: 'Tools', exact: true }).click();
        await page.getByRole('link', { name: 'Course Admin' }).click();
        await page.getByRole('link', { name: 'Import / Export / Copy' }).click();
        const page1Promise = page.waitForEvent('popup');
        await page.getByRole('button', { name: 'Search for offering' }).click();
        const page1 = await page1Promise;
        await page1.frameLocator('internal:attr=[title="Body"i]').locator('#z_b').click();
        await page1.frameLocator('internal:attr=[title="Body"i]').locator('#z_b').fill(`${requestItem.source_course_id.trim()}`);
        await page1.frameLocator('internal:attr=[title="Body"i]').getByRole('button', { name: 'Search' }).click();
        await page1.frameLocator('internal:attr=[title="Body"i]').getByRole('radio').first().check();
        await page1.frameLocator('internal:attr=[title="Footer"i]').getByRole('button', { name: 'Add Selected' }).click();
        await page.waitForTimeout(25000);

        const result: resultRecord = {
            request: requestItem,
            status: "success",
        }
        resultList.push(result)

    } catch (error) {
        console.error(error);
        const result: resultRecord = {
            request: requestItem,
            status: "failure",
            error: String(error)
        }
        resultList.push(result)
    }

    // ---------------------
    await context.close();
    await browser.close();
    return
}

type resultRecord = {
    request: requestItem
    status: "success" | "failure"
    error?: string
}

type requestItem = {
    course: string;
    cf_course_id: number;
    cf_term_id: number;
    source_course_id: string;
    org_id: number;
}

async function run() {
    for (const searchItem of data) {
        await lookup(searchItem)
    }
    try {
        fs.writeFileSync('data/output.json', JSON.stringify(resultList))
        console.log('✅ JSON file created successfully!')
    } catch (err) {
        console.error('🚫 Error writing JSON file:', err)
    }
}

run()