const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const ARC_CHAIN_ID = '0x4cef52'; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer;

// 1. AUTO-CONNECT (Page reload par state check)
async function autoConnect() {
    if (window.ethereum && localStorage.getItem("isWalletConnected") === "true") {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) setupWallet(accounts[0]);
    }
}

// 2. CONNECT WALLET (Har baar naya selection popup aayega)
async function connectWallet() {
    if (!window.ethereum) return alert("Install Web3 Wallet!");

    try {
        // Force account selection popup
        await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }]
        });

        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        
        // Auto-Switch Network
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ARC_CHAIN_ID }],
            });
        } catch (err) {
            if (err.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CHAIN_ID,
                        chainName: 'Arc Network Testnet',
                        rpcUrls: ['https://rpc-testnet.arcnetwork.io'],
                        nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
                        blockExplorerUrls: ['https://explorer-testnet.arcnetwork.io']
                    }]
                });
            }
        }
        setupWallet(accounts[0]);
    } catch (e) { console.error(e); }
}

// 3. SETUP WALLET (UI Format: 0x12...5678)
async function setupWallet(addr) {
    userAddress = addr;
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    const shortAddr = addr.substring(0, 4) + "..." + addr.substring(addr.length - 4);
    document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
    document.getElementById("dot").classList.remove("animate-pulse");
    document.getElementById("walletLabel").innerText = shortAddr.toUpperCase();

    localStorage.setItem("isWalletConnected", "true");
    fetchBalance();
}

// 4. LIVE SEND FEATURE
function openSend() {
    if(!userAddress) return connectWallet();
    document.getElementById("sendModal").classList.remove("hidden");
}

async function processSend() {
    const to = document.getElementById("sendTo").value;
    const amt = document.getElementById("sendAmt").value;
    const btn = document.getElementById("finalSendBtn");

    if(!to || !amt) return alert("Details bharo bhai!");

    try {
        btn.innerText = "CONFIRMING...";
        btn.disabled = true;

        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        const tx = await contract.transfer(to, ethers.utils.parseUnits(amt, 6));
        
        await tx.wait();
        alert("Payment Successful on Arc Network!");
        location.reload();
    } catch (e) {
        alert("Transaction Failed!");
        btn.innerText = "CONFIRM & PAY";
        btn.disabled = false;
    }
}

// 5. DISCONNECT
function disconnectWallet() {
    localStorage.removeItem("isWalletConnected");
    location.reload();
}

// Helper: Close Modal
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }

window.onclick = (e) => { if (!e.target.matches('#walletBtn, #walletBtn *')) document.getElementById("profileMenu").classList.remove("show"); }
