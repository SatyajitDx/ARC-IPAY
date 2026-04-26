// --- CONFIGURATION ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const MERCHANT_ADDRESS = "0x7a67f9b3BB918182Ad94182aC10f80F9619be81C"; // Merchant Wallet
const ARC_CHAIN_ID = '0x4cef52'; 
const RPC_URL = 'https://rpc.testnet.arc.network';
const INR_RATE = 94.25; 

let userAddress = "", provider, signer, codeReader, currentService = "DIRECT";

// --- INITIALIZE ON LOAD ---
window.addEventListener('load', async () => {
    if (window.ethereum && localStorage.getItem("isWalletConnected") === "true") {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) setupWallet(accounts[0]);
    }
});

// --- WALLET SETUP ---
async function connectWallet() {
    if (!window.ethereum) return alert("Please install MetaMask!");
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        await window.ethereum.request({ 
            method: 'wallet_switchEthereumChain', 
            params: [{ chainId: ARC_CHAIN_ID }] 
        }).catch(async (e) => {
            if (e.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CHAIN_ID,
                        chainName: 'Arc Testnet',
                        rpcUrls: [RPC_URL],
                        nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
                        blockExplorerUrls: ['https://testnet.arcscan.app']
                    }]
                });
            }
        });
        setupWallet(accounts[0]);
    } catch (e) { console.error(e); }
}

function setupWallet(addr) {
    userAddress = addr;
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    
    document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
    document.getElementById("dot").classList.remove("animate-pulse");
    document.getElementById("walletLabel").innerText = addr.substring(0, 6) + "..." + addr.slice(-4).toUpperCase();
    
    localStorage.setItem("isWalletConnected", "true");
    fetchBalance();
}

// --- BILLING UI LOGIC ---
function openBilling(serviceType) {
    if(!userAddress) return connectWallet();
    currentService = serviceType.toUpperCase();
    
    const modal = document.getElementById("sendModal");
    const label = modal.querySelector('label[for="sendTo"]');
    const input = document.getElementById("sendTo");
    const billingFields = document.getElementById("billingFields");

    modal.classList.remove("hidden");
    modal.querySelector('h3').innerText = `${currentService} PAYMENT`;
    billingFields.innerHTML = ""; 

    if(currentService === 'MOBILE') {
        label.innerText = "Mobile Number";
        input.placeholder = "Enter 10 digit number";
        billingFields.innerHTML = `
            <label class="text-[9px] font-black uppercase text-[#FF9933] ml-2 mb-1 block">Select Plan</label>
            <select class="w-full p-4 bg-gray-50 rounded-2xl border-none text-xs font-bold mb-4">
                <option>Unlimited Pack - ₹299 (28 Days)</option>
                <option>Data Booster - ₹19 (1GB)</option>
                <option>Topup - ₹100 (Talktime)</option>
            </select>`;
    } else {
        label.innerText = "Consumer ID / Account No";
        input.placeholder = "Enter ID Number";
    }
    
    // Reset amount field for INR
    modal.querySelector('label[class*="text-[#138808]"]').innerText = "Amount in INR (₹)";
    document.getElementById("sendAmt").placeholder = "0";
    document.getElementById("sendAmt").value = "";
    document.getElementById("inrCalcDisplay").innerText = "≈ (0.00 USDC)";
}

function openSend() {
    if(!userAddress) return connectWallet();
    currentService = "DIRECT";
    document.getElementById("sendModal").classList.remove("hidden");
    document.getElementById("sendModal").querySelector('h3').innerText = "SEND USDC";
    document.getElementById("billingFields").innerHTML = "";
    document.getElementById("sendTo").placeholder = "0x...";
    document.querySelector('label[for="sendTo"]').innerText = "Recipient Address";
    document.querySelector('label[class*="text-[#138808]"]').innerText = "Amount USDC";
}

// --- REAL-TIME CALCULATION ---
function updateInrCalc() {
    const val = document.getElementById("sendAmt").value;
    const display = document.getElementById("inrCalcDisplay");
    
    if (val > 0) {
        if (currentService === "DIRECT") {
            display.innerText = `≈ (₹${(val * INR_RATE).toFixed(2)})`;
        } else {
            const usdc = (val / INR_RATE).toFixed(4);
            display.innerText = `≈ (${usdc} USDC will be deducted)`;
        }
    } else {
        display.innerText = "≈ (₹0.00)";
    }
}

// --- CORE PAYMENT PROCESSOR ---
async function processSend() {
    const target = document.getElementById("sendTo").value;
    const inputVal = document.getElementById("sendAmt").value;
    const btn = document.getElementById("finalSendBtn");

    if(!target || !inputVal) return alert("Please fill all details!");

    try {
        btn.innerText = "PROCESSING..."; btn.disabled = true;

        let finalRecipient = currentService === "DIRECT" ? target : MERCHANT_ADDRESS;
        let usdcAmount = currentService === "DIRECT" ? inputVal : (inputVal / INR_RATE).toFixed(6);

        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        const tx = await contract.transfer(finalRecipient, ethers.utils.parseUnits(usdcAmount.toString(), 6));
        
        btn.innerText = "CONFIRMING...";
        await tx.wait(1);

        document.getElementById("sendModal").classList.add("hidden");
        document.getElementById("receiptModal").classList.remove("hidden");
        
        document.getElementById("recAmt").innerText = currentService === "DIRECT" ? `${usdcAmount} USDC` : `₹${inputVal}`;
        document.getElementById("recInr").innerText = currentService === "DIRECT" ? `≈ ₹${(usdcAmount * INR_RATE).toFixed(2)}` : `Service: ${currentService}`;
        document.getElementById("recTo").innerText = `Ref: ${target}`;

        fetchBalance();
    } catch (e) {
        console.error(e);
        document.getElementById("sendModal").classList.add("hidden");
        document.getElementById("failModal").classList.remove("hidden");
    } finally {
        btn.innerText = "Confirm Payment"; btn.disabled = false;
    }
}

// --- SCAN & HISTORY ---
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
            closeModal('scanModal');
            openSend();
            document.getElementById("sendTo").value = result.text;
        }
    } catch (e) { console.error(e); closeModal('scanModal'); }
}

async function openHistory() {
    if(!userAddress) return connectWallet();
    document.getElementById("historyModal").classList.remove("hidden");
    const list = document.getElementById("txList");
    list.innerHTML = `<p class="text-[10px] text-center opacity-20">Fetching logs...</p>`;
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["event Transfer(address indexed from, address indexed to, uint256 value)"], provider);
        const logs = await contract.queryFilter(contract.filters.Transfer(userAddress, null), -500);
        list.innerHTML = logs.length === 0 ? "No Transactions" : logs.reverse().map(l => `
            <div class="bg-gray-50 p-4 rounded-2xl mb-2 border border-gray-100">
                <p class="text-[9px] font-black text-red-500">SENT</p>
                <p class="text-xs font-black italic">₹${(ethers.utils.formatUnits(l.args.value, 6) * INR_RATE).toFixed(2)}</p>
                <p class="text-[8px] truncate opacity-40">${l.args.to}</p>
            </div>`).join('');
    } catch (e) { list.innerHTML = "Error loading history."; }
}

// --- UTILS ---
function fetchBalance() {
    if(!userAddress) return;
    const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
    contract.balanceOf(userAddress).then(bal => {
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    });
}

function closeModal(id) { 
    document.getElementById(id).classList.add("hidden"); 
    if(id === 'scanModal' && codeReader) codeReader.reset();
}

function disconnectWallet() { localStorage.removeItem("isWalletConnected"); location.reload(); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); }

window.onclick = (e) => {
    if (!e.target.matches('#walletBtn, #walletBtn *')) {
        const menu = document.getElementById("profileMenu");
        if (menu && menu.classList.contains("show")) menu.classList.remove("show");
    }
}
