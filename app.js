// --- CONFIGURATION ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const MERCHANT_ADDRESS = "0x7a67f9b3BB918182Ad94182aC10f80F9619be81C"; 
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

// --- WALLET CORE ---
async function connectWallet() {
    if (!window.ethereum) return alert("Install MetaMask!");
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
    document.getElementById("dot").className = "bg-green-500 w-2 h-2 rounded-full";
    document.getElementById("walletLabel").innerText = addr.substring(0, 6) + "..." + addr.slice(-4).toUpperCase();
    localStorage.setItem("isWalletConnected", "true");
    fetchBalance();
}

// --- DYNAMIC BILLING LOGIC ---
function openBilling(serviceType) {
    if(!userAddress) return connectWallet();
    currentService = serviceType.toUpperCase();
    
    const modal = document.getElementById("sendModal");
    const label = document.getElementById("inputLabel");
    const input = document.getElementById("sendTo");
    const billingFields = document.getElementById("billingFields");
    const noteBox = document.getElementById("sendPurpose");

    modal.classList.remove("hidden");
    modal.querySelector('h3').innerText = currentService === 'ELECTRIC' ? 'ELECTRICITY BILL' : `${currentService} RECHARGE`;
    
    if(noteBox) noteBox.classList.add("hidden");
    billingFields.innerHTML = ""; 

    if(currentService === 'MOBILE') {
        label.innerText = "Mobile Number";
        input.placeholder = "Enter 10 digit number";
        input.classList.remove("font-mono");
        
        billingFields.innerHTML = `
            <label class="text-[9px] font-black uppercase text-[#FF9933] ml-2 mb-1 block">Operator</label>
            <select class="w-full p-4 bg-gray-50 rounded-2xl border-none text-xs font-bold mb-4">
                <option>JIO Prepaid</option><option>Airtel Prepaid</option><option>VI Prepaid</option><option>BSNL</option>
            </select>
            <label class="text-[9px] font-black uppercase text-[#FF9933] ml-2 mb-1 block">Select Plan</label>
            <select id="planSelect" onchange="updateAmountFromPlan(this)" class="w-full p-4 bg-gray-50 rounded-2xl border-none text-xs font-bold mb-4">
                <option value="0">Choose a Plan</option>
                <option value="299">Unlimited Pack ₹299</option>
                <option value="19">Data Booster ₹19</option>
                <option value="155">Validity Pack ₹155</option>
                <option value="666">Premium Pack ₹666</option>
            </select>
        `;
    } else {
        label.innerText = currentService === 'ELECTRIC' ? "Consumer Number" : "Consumer ID / Account No";
        input.placeholder = `Enter your ${currentService} ID`;
        input.classList.remove("font-mono");
        
        let billerOptions = "";
        if(currentService === 'ELECTRIC') {
            billerOptions = `<option>Adani Electricity</option><option>Tata Power</option><option>MSEDCL</option><option>UPPCL</option>`;
        } else if(currentService === 'DTH') {
            billerOptions = `<option>Tata Play</option><option>Airtel Digital TV</option><option>Dish TV</option>`;
        } else if(currentService === 'WIFI') {
            billerOptions = `<option>Airtel Xstream</option><option>Jio Fiber</option><option>ACT Fibernet</option>`;
        }

        billingFields.innerHTML = `
            <label class="text-[9px] font-black uppercase text-[#FF9933] ml-2 mb-1 block">Select Provider</label>
            <select class="w-full p-4 bg-gray-50 rounded-2xl border-none text-xs font-bold mb-4">
                ${billerOptions}
            </select>
        `;
    }
    document.getElementById("sendAmt").value = "";
    document.getElementById("inrCalcDisplay").innerText = "≈ (0.00 USDC)";
}

function openSend() {
    if(!userAddress) return connectWallet();
    currentService = "DIRECT";
    document.getElementById("sendModal").classList.remove("hidden");
    document.getElementById("sendModal").querySelector('h3').innerText = "SEND USDC";
    document.getElementById("inputLabel").innerText = "Recipient Address";
    document.getElementById("sendTo").placeholder = "0x...";
    document.getElementById("sendTo").classList.add("font-mono");
    document.getElementById("billingFields").innerHTML = "";
    
    const noteBox = document.getElementById("sendPurpose");
    if(noteBox) noteBox.classList.remove("hidden");
}

// --- CALCULATION & PAYMENT ---
function updateInrCalc() {
    const val = document.getElementById("sendAmt").value;
    const display = document.getElementById("inrCalcDisplay");
    if (val > 0) {
        if (currentService === "DIRECT") {
            display.innerText = `≈ (₹${(val * INR_RATE).toFixed(2)})`;
        } else {
            display.innerText = `≈ (${(val / INR_RATE).toFixed(4)} USDC)`;
        }
    } else { display.innerText = "≈ (₹0.00)"; }
}

async function processSend() {
    const target = document.getElementById("sendTo").value;
    const inputVal = document.getElementById("sendAmt").value;
    const btn = document.getElementById("finalSendBtn");

    if(!target || !inputVal) return alert("Details bharo bhai!");

    try {
        btn.innerText = "WAITING FOR WALLET..."; btn.disabled = true;
        let finalDest = currentService === "DIRECT" ? target : MERCHANT_ADDRESS;
        let usdcAmount = currentService === "DIRECT" ? inputVal : (inputVal / INR_RATE).toFixed(6);

        // Fix MetaMask Unknown
        const contract = new ethers.Contract(USDC_ADDR, [
            "function transfer(address to, uint256 value) returns (bool)"
        ], signer);

        const baseFee = ethers.utils.parseUnits("20", "gwei"); 
        const priorityFee = ethers.utils.parseUnits("5", "gwei"); 

        const tx = await contract.transfer(
            finalDest, 
            ethers.utils.parseUnits(usdcAmount.toString(), 6),
            {
                maxFeePerGas: baseFee.add(priorityFee),
                maxPriorityFeePerGas: priorityFee,
                gasLimit: 120000 
            }
        );

        // REAL-TIME BLOCKCHAIN MINING STATUS
        btn.innerText = "MINING ON ARC...";
        
        const receipt = await tx.wait(1); // Wait for real confirmation

        if(receipt.status === 1) {
            document.getElementById("sendModal").classList.add("hidden");
            document.getElementById("receiptModal").classList.remove("hidden");
            document.getElementById("recAmt").innerText = currentService === "DIRECT" ? `${usdcAmount} USDC` : `₹${inputVal}`;
            document.getElementById("recTo").innerText = `Ref: ${target.substring(0,8)}...`;
            fetchBalance();
        }

    } catch (e) {
        console.error(e);
        document.getElementById("sendModal").classList.add("hidden");
        document.getElementById("failModal").classList.remove("hidden");
        document.getElementById("failReason").innerText = e.message.includes("txpool") 
            ? "Network Busy. Try again!" : "Transaction Failed or Denied";
    } finally {
        btn.innerText = "Confirm Payment"; btn.disabled = false;
    }
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
            closeModal('scanModal'); openSend();
            document.getElementById("sendTo").value = result.text;
        }
    } catch (e) { console.error(e); closeModal('scanModal'); }
}

function closeModal(id) { 
    document.getElementById(id).classList.add("hidden"); 
    if(id === 'scanModal' && codeReader) codeReader.reset();
}

function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); }
function toggleProfile() { if(!userAddress) connectWallet(); else document.getElementById("profileMenu").classList.toggle("show"); }
function disconnectWallet() { localStorage.removeItem("isWalletConnected"); location.reload(); }

function openReceive() {
    if(!userAddress) return connectWallet();
    document.getElementById("receiveModal").classList.remove("hidden");
    const qrDiv = document.getElementById("qrcode");
    qrDiv.innerHTML = ""; 
    document.getElementById("myAddr").innerText = userAddress;
    new QRCode(qrDiv, { text: userAddress, width: 180, height: 180, colorDark : "#121271", colorLight : "#ffffff" });
}

async function openHistory() {
    if (!userAddress) return connectWallet();
    const modal = document.getElementById("historyModal");
    const list = document.getElementById("txList");
    modal.classList.remove("hidden");
    
    // Live Blockchain Scanning UI
    list.innerHTML = `<div class="flex flex-col items-center justify-center py-10 opacity-30"><i class="fa-solid fa-circle-notch animate-spin text-2xl mb-2 text-[#121271]"></i><p class="text-[10px] font-black uppercase tracking-widest text-[#121271]">Scanning Blockchain...</p></div>`;
    
    try {
        const contract = new ethers.Contract(USDC_ADDR, [
            "event Transfer(address indexed from, address indexed to, uint256 value)"
        ], provider);

        const filter = contract.filters.Transfer(userAddress, null);
        const logs = await contract.queryFilter(filter, -5000, "latest");
        
        if (logs.length === 0) { list.innerHTML = `<p class="text-center opacity-20 mt-10">No History Found on Chain</p>`; return; }
        
        list.innerHTML = logs.reverse().slice(0, 15).map(l => {
            const amt = ethers.utils.formatUnits(l.args.value, 6);
            return `<div class="bg-gray-50 p-4 rounded-3xl mb-3 border border-gray-100 shadow-sm">
                <div class="flex justify-between">
                    <div>
                        <p class="text-[9px] font-black text-red-500 italic uppercase">Sent Success</p>
                        <p class="text-[8px] truncate w-32 opacity-40 font-mono">To: ${l.args.to}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-black italic text-[#121271]">₹${(amt * INR_RATE).toFixed(2)}</p>
                        <p class="text-[8px] opacity-20 font-bold">${amt} USDC</p>
                    </div>
                </div>
                <div class="mt-2 pt-2 border-t border-dashed border-gray-200 flex justify-between items-center">
                    <p class="text-[7px] font-bold opacity-20 uppercase tracking-widest text-[#121271]">Arc Chain Verified</p>
                    <a href="https://testnet.arcscan.app/tx/${l.transactionHash}" target="_blank" class="text-[7px] font-black text-blue-600 underline uppercase italic">View on Scan</a>
                </div>
            </div>`;
        }).join('');
    } catch (e) { list.innerHTML = `<p class="text-center text-red-500 font-bold uppercase text-[10px] mt-10">Node Busy. Try Again.</p>`; }
}

function updateAmountFromPlan(selectElement) {
    const amount = selectElement.value;
    const amountInput = document.getElementById("sendAmt");
    if(amount > 0) {
        amountInput.value = amount;
        updateInrCalc();
    }
}
