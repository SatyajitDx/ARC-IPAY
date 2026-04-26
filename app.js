const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const ARC_CHAIN_ID = '0x4cef52'; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer, codeReader;

// --- INITIALIZE ON LOAD ---
window.addEventListener('load', async () => {
    if (window.ethereum && localStorage.getItem("isWalletConnected") === "true") {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) setupWallet(accounts[0]);
    }
});

// --- WALLET CORE LOGIC ---
async function toggleProfile() {
    if (!userAddress) connectWallet();
    else document.getElementById("profileMenu").classList.toggle("show");
}

async function connectWallet() {
    if (!window.ethereum) return alert("Please install MetaMask or OKX Wallet!");
    try {
        // Request specific account permissions to allow switching
        await window.ethereum.request({ 
            method: 'wallet_requestPermissions', 
            params: [{ eth_accounts: {} }] 
        });
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        
        // Auto-Switch to Arc Network
        try {
            await window.ethereum.request({ 
                method: 'wallet_switchEthereumChain', 
                params: [{ chainId: ARC_CHAIN_ID }] 
            });
        } catch (e) {
            if (e.code === 4902) {
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
    } catch (e) { console.error("Connection Cancelled", e); }
}

async function setupWallet(addr) {
    userAddress = addr;
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    
    // UI Formatting: 0x12...ABCD
    const short = addr.substring(0, 6) + "..." + addr.substring(addr.length - 4);
    document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
    document.getElementById("dot").classList.remove("animate-pulse");
    document.getElementById("walletLabel").innerText = short.toUpperCase();
    
    localStorage.setItem("isWalletConnected", "true");
    fetchBalance();
}

// --- SEND FEATURE (WITH GAS CHECK) ---
function openSend() {
    if(!userAddress) return connectWallet();
    document.getElementById("sendModal").classList.remove("hidden");
    document.getElementById("sendTo").value = "";
    document.getElementById("sendAmt").value = "";
}

async function processSend() {
    const to = document.getElementById("sendTo").value;
    const amt = document.getElementById("sendAmt").value;
    const btn = document.getElementById("finalSendBtn");

    if(!ethers.utils.isAddress(to)) return alert("Invalid Recipient Address!");
    if(!amt || amt <= 0) return alert("Enter a valid amount!");

    try {
        btn.innerText = "CHECKING GAS..."; btn.disabled = true;

        // CRITICAL: Check if user has ARC for Gas Fees
        const gasBalance = await provider.getBalance(userAddress);
        if (gasBalance.isZero()) {
            btn.innerText = "NO GAS (ARC)";
            btn.disabled = false;
            return alert("You need ARC tokens to pay for network fees. Please use the Arc Faucet.");
        }

        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        
        btn.innerText = "WAITING FOR WALLET...";
        // Sending Transaction (USDC uses 6 decimals)
        const tx = await contract.transfer(to, ethers.utils.parseUnits(amt, 6));
        
        btn.innerText = "CONFIRMING...";
        await tx.wait();
        
        alert("Transaction Successful!");
        location.reload();
    } catch (e) {
        console.error(e);
        alert("Transaction Failed! Ensure you have enough USDC and ARC.");
        btn.innerText = "CONFIRM PAYMENT"; btn.disabled = false;
    }
}

// --- RECEIVE FEATURE ---
function openReceive() {
    if(!userAddress) return connectWallet();
    document.getElementById("receiveModal").classList.remove("hidden");
    const qrDiv = document.getElementById("qrcode");
    qrDiv.innerHTML = "";
    document.getElementById("myAddr").innerText = userAddress;
    // Professional QR Generation
    new QRCode(qrDiv, { text: userAddress, width: 200, height: 200, colorDark: "#121271" });
}

// --- SCAN & PAY FEATURE ---
async function openScan() {
    if(!userAddress) return connectWallet();
    document.getElementById("scanModal").classList.remove("hidden");
    codeReader = new ZXing.BrowserQRCodeReader();
    const videoElem = document.getElementById("scanVideo");
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        videoElem.srcObject = stream;
        videoElem.play();
        const result = await codeReader.decodeFromVideoElement(videoElem);
        if(ethers.utils.isAddress(result.text)) {
            stopCamera();
            closeModal('scanModal');
            document.getElementById("sendModal").classList.remove("hidden");
            document.getElementById("sendTo").value = result.text;
        }
    } catch (e) { 
        console.error("Camera Error", e);
        closeModal('scanModal'); 
    }
}

// --- HISTORY FEATURE (FETCH 1000 BLOCKS) ---
async function openHistory() {
    if(!userAddress) return connectWallet();
    document.getElementById("historyModal").classList.remove("hidden");
    const list = document.getElementById("txList");
    list.innerHTML = `<p class="text-[10px] text-center opacity-20 italic">Scanning Blockchain...</p>`;
    
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["event Transfer(address indexed from, address indexed to, uint256 value)"], provider);
        const filter = contract.filters.Transfer(userAddress, null);
        // Range adjusted for Testnet logs
        const logs = await contract.queryFilter(filter, -1000, "latest");
        
        if(logs.length === 0) {
            list.innerHTML = `<p class="text-center text-xs opacity-20 mt-10">No recent transactions</p>`;
            return;
        }

        list.innerHTML = logs.slice(-15).reverse().map(l => `
            <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-2">
                <div class="flex justify-between items-center">
                    <p class="text-[9px] font-black ${l.args.from.toLowerCase() === userAddress.toLowerCase() ? 'text-red-500' : 'text-green-500'}">
                        ${l.args.from.toLowerCase() === userAddress.toLowerCase() ? 'SENT' : 'RECEIVED'}
                    </p>
                    <p class="text-xs font-black italic">₹${(ethers.utils.formatUnits(l.args.value, 6) * INR_RATE).toFixed(2)}</p>
                </div>
                <p class="text-[8px] font-mono opacity-40 mt-1 truncate">
                    ${l.args
