/** Connect to Moralis server */
const serverUrl = "";
const appId = "";
Moralis.start({ serverUrl, appId });

/** Add from here down */
let currentTrade = {};
let currentSelectSide;
let tokens;

async function init() {
    await Moralis.initPlugins();
    await Moralis.enableWeb3();

    // harus authenticate dulu sebelum bisa balikin data current user
    await login();
    await listAvaiableTokens();
    if (Moralis.User.current().get('ethAddress') !== null) {
        document.getElementById("swap_button").disabled = false;
    }
}

async function listAvaiableTokens() {
    const results = await Moralis.Plugins.oneInch.getSupportedTokens({
        chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
    });
    tokens = results.tokens;
    console.log(tokens);
    let parent = document.getElementById("token_list");
    for (const address in tokens) {
        let token = tokens[address];
        let div = document.createElement("div");
        div.setAttribute("data-address", address);
        div.className = "token_row";
        let html =
            `
            <img class="token_list_img" src="${token.logoURI}">
            <span class="token_list_text">
                ${token.symbol}
            </span>
        `
        div.innerHTML = html;
        div.onclick = (() => selectToken(address));
        parent.appendChild(div);
    }
}

function selectToken(address) {
    closeModal();
    currentTrade[currentSelectSide] = tokens[address];
    console.log(currentTrade);
    renderInterface();
    getQuote();
}

function renderInterface() {
    if (currentTrade['from'] !== undefined) {
        document.getElementById("from_token_image").src = currentTrade['from'].logoURI;
        document.getElementById("from_token_text").innerHTML = currentTrade['from'].symbol;
    }

    if (currentTrade['to'] !== undefined) {
        document.getElementById("to_token_image").src = currentTrade['to'].logoURI;
        document.getElementById("to_token_text").innerHTML = currentTrade['to'].symbol;
    }
}

async function login() {
    let user = Moralis.User.current();

    if (!user) {
        try {
            user = await Moralis.authenticate({ signingMessage: "Hello World!" })
            console.log(user)
            console.log(user.get('ethAddress'))

        } catch (error) {
            console.log(error)
        }
    }
}


function openModal(side) {
    currentSelectSide = side;
    document.getElementById("token_modal").style.display = "block";
}

function closeModal() {
    document.getElementById("token_modal").style.display = "none";
}

async function getQuote() {
    if (!document.getElementById("from_amount").value || !currentTrade.to || !currentTrade.from) return;

    let amount = Number(document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals);

    const quote = await Moralis.Plugins.oneInch.quote({
        chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
        fromTokenAddress: currentTrade.from.address, // The token you want to swap
        toTokenAddress: currentTrade.to.address, // The token you want to receive
        amount: amount,
    });
    console.log(quote);
    document.getElementById("gas_estimate").innerHTML = quote.estimatedGas;
    document.getElementById("to_amount").value = quote.toTokenAmount / (10 ** quote.toToken.decimals);
    // document.getElementById("to_amount").value = 11

}

async function trySwap() {

    if (!document.getElementById("from_amount").value || !currentTrade.to || !currentTrade.from) return;
    let address = Moralis.User.current().get('ethAddress');
    let amount = Number(document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals);
    if (currentTrade.from.symbol !== "ETH") {

        let allowance = await hasAllowance(address, amount);
        if (!allowance) {
            await approve(address);
        }
    }
    let receipt = await doSwap(address, amount);
    alert("Swap complete");
    console.log(receipt);
}

async function doSwap(address, amount) {
    
    
    const receipt = await Moralis.Plugins.oneInch.swap({
        chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
        fromTokenAddress: currentTrade.from.address, // The token you want to swap
        toTokenAddress: currentTrade.to.address, // The token you want to receive
        amount,
        fromAddress: address, // Your wallet address
        slippage: 1,
    });

    return receipt;


}

async function approve(address) {
    await Moralis.Plugins.oneInch.approve({
        chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
        tokenAddress: currentTrade.from.address, // The token you want to swap
        fromAddress: address, // Your wallet address
    });
}

async function hasAllowance(address, amount) {
    const allowance = await Moralis.Plugins.oneInch.hasAllowance({
        chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
        fromTokenAddress: currentTrade.from.address, // The token you want to swap
        fromAddress: address, // Your wallet address
        amount,
    });
    return allowance;
}

init();


document.getElementById("btn-login").onclick = login;
document.getElementById("to_token_select").onclick = (() => openModal("to"));
document.getElementById("from_token_select").onclick = (() => openModal("from"));
document.getElementById("modal_button_close").onclick = closeModal;
document.getElementById("from_amount").onblur = getQuote;
document.getElementById("swap_button").onclick = trySwap;



/** Useful Resources  */

// https://docs.moralis.io/moralis-server/users/crypto-login
// https://docs.moralis.io/moralis-server/getting-started/quick-start#user
// https://docs.moralis.io/moralis-server/users/crypto-login#metamask

/** Moralis Forum */

// https://forum.moralis.io/