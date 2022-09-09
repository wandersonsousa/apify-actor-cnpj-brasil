/**
 * This template is a production ready boilerplate for developing with `CheerioCrawler`.
 * Use this to bootstrap your projects using the most up-to-date code.
 * If you're looking for examples or want to learn more, see README.
 */

// For more information, see https://sdk.apify.com
import { Actor } from 'apify';
// For more information, see https://crawlee.dev
import { PuppeteerCrawler, Dataset, Log } from 'crawlee';
import { cnaes } from './config';
import { SearchAdvancedPage } from './helpers';

async function main() {
    await Actor.init();

    const startUrls:string[] = ['https://casadosdados.com.br/solucao/cnpj/pesquisa-avancada'];
    type Input ={
        date:string,
        stateCode:string
    }
    const { stateCode, date } = await Actor.getInput() as Input;

    const crawler = new PuppeteerCrawler({
        launchContext: {
            launchOptions: {
                headless: false,
            },
        },
        maxRequestsPerCrawl: 50,

        async requestHandler({ page, log }) {
            await Promise.allSettled(
                cnaes.map(async (cnae) => {
                    log.error(`Request for cnae ${cnae}`);
                    const CNPJ_DATALIST = await SearchAdvancedPage(page, {
                        state: stateCode,
                        date,
                        page: 1,
                        cnaeList: [
                            cnae,
                        ],
                    }, log);
                    await Dataset.pushData(CNPJ_DATALIST);
                    return true;
                }),
            );
        },

        failedRequestHandler({ request, log }) {
            log.error(`Request ${request.url} failed too many times.`);
        },
    });
    await crawler.run(startUrls);

    await Actor.exit();
}

main();
