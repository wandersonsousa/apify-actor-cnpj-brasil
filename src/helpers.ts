import { Log } from 'crawlee';
import { Page } from 'puppeteer';

type Filters = {
    state:string,
    date:string,
    page:number,
    cnaeList?:string[]
}

export async function SearchAdvancedPage(page:Page, filters:Filters, log:Log) {
    const payload = makeSearchCNPJPayload(filters);

    await page.goto(
        'https://casadosdados.com.br/solucao/cnpj/pesquisa-avancada',
        { waitUntil: 'domcontentloaded' },
    );
    const cnpjListData = [];
    const currentPage = 1;

    filters.page = currentPage;
    const firstPageData = await searchRequestInject(page, payload);

    if (firstPageData.data.count === 0) {
        log.warning('Não foram encontrados resultados para os dados buscados');
        return [];
    }

    log.info(
        `${firstPageData.data.count} resultados encontrados para a pesquisa`,
    );
    log.debug('Buscando dados genéricos para busca...');
    if (firstPageData.data.count > 1000) {
        const finalPageNumber = 50;

        for (let i = currentPage; i <= finalPageNumber; i++) {
            payload.page = i;
            const pageData = await searchRequestInject(page, payload);
            cnpjListData.push(...pageData.data.cnpj);
        }

        return cnpjListData;
    }

    if (firstPageData.data.count <= 20) {
        cnpjListData.push(...firstPageData.data.cnpj);
        return cnpjListData;
    }

    const finalPageNumber = Math.ceil(firstPageData.data.count / 20);
    for (let i = currentPage; i <= finalPageNumber; i++) {
        payload.page = i;
        const pageData = await searchRequestInject(page, payload);
        cnpjListData.push(...pageData.data.cnpj);
    }
    log.info('Dados de pesquisa capturados com sucesso');
    return cnpjListData;
}

export async function searchRequestInject(page: Page, payloadToInject:ReturnType<typeof makeSearchCNPJPayload>) {
    const searchResponse = await page.evaluate(async (body:ReturnType<typeof makeSearchCNPJPayload>) => {
        async function requestInject(bodyRequest:ReturnType<typeof makeSearchCNPJPayload>) {
            return window
                .fetch(
                    'https://api.casadosdados.com.br/v2/public/cnpj/search',
                    {
                        headers: {
                            accept: 'application/json, text/plain, */*',
                            'accept-language': 'en-US,en;q=0.9',
                            'content-type': 'application/json;charset=UTF-8',
                            'sec-ch-ua':
                                '"Chromium";v="92", " Not A;Brand";v="99", "Google Chrome";v="92"',
                            'sec-ch-ua-mobile': '?0',
                            'sec-fetch-dest': 'empty',
                            'sec-fetch-mode': 'cors',
                            'sec-fetch-site': 'same-site',
                        },
                        referrer: 'https://casadosdados.com.br/',
                        referrerPolicy: 'strict-origin-when-cross-origin',
                        body: JSON.stringify(bodyRequest),
                        method: 'POST',
                        mode: 'cors',
                    },
                )
                .then((res) => res.json())
                .then((json) => json);
        }

        const cnpjDataFromFilter = await requestInject(body);

        return cnpjDataFromFilter;
    }, payloadToInject);

    if (!searchResponse.success) {
        throw new Error('Error injecting the request');
    }

    return searchResponse;
}

function makeSearchCNPJPayload({
    date,
    state,
}: {
    date: string;
    state: string;
}) {
    const payload = {
        query: {
            termo: [],
            atividade_principal: [],
            natureza_juridica: [],
            uf: [state],
            municipio: [],
            situacao_cadastral: 'ATIVA',
            cep: [],
            ddd: [],
        },
        range_query: {
            data_abertura: { lte: date, gte: date },
            capital_social: { lte: null, gte: null },
        },
        extras: {
            somente_mei: false,
            excluir_mei: false,
            com_email: false,
            incluir_atividade_secundaria: false,
            com_contato_telefonico: false,
            somente_fixo: false,
            somente_celular: false,
            somente_matriz: false,
            somente_filial: false,
        },
        page: 1,
    };

    return payload;
}
