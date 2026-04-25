const USDC_ADDR = "0x3600000000000000000000000000000000000000"; // Testnet USDC
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const ARC_CHAIN_ID = '0x4cef52'; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer;

// --- CONNECTION ---
async function autoConnect() {
    if (!window.ethereum) return alert("Install Wallet!");
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        const network = await provider.getNetwork();
        if(ethers.utils.hexValue(network.chainId) !== ARC_CHAIN_ID) {
            await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ARC_CHAIN_ID }] });
            location.reload();
        }

        document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
        document.getElementById("walletLabel").innerText = userAddress.slice(0, 10) + "...";
        fetchBalance();
        getTxLogs();
    } catch (e) { console.error(e); }
}

async function disconnectWallet() {
    userAddress = "";
    signer = null;
    document.getElementById("dot").classList.replace("bg-green-500", "bg-red-500");
    document.getElementById("walletLabel").innerText = "Wallet Disconnect";
    document.getElementById("profileMenu").classList.remove("show");
    alert("Disconnected!");
}

// --- SEND & RECEIVE ---
function openSend() {
    if(!userAddress) return autoConnect();
    document.getElementById("sendModal").classList.remove("hidden");
}

function openReceive() {
    if(!userAddress) return autoConnect();
    document.getElementById("receiveModal").classList.remove("hidden");
    document.getElementById("myFullAddr").innerText = userAddress;
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), { text: userAddress, width: 150, height: 150 });
}

async function processSend() {
    const to = document.getElementById("sendAddr").value;
    const val = document.getElementById("sendAmt").value;
    if(!to || !val) return alert("Bharo!");

    const btn = document.getElementById("sendBtn");
    try {
        btn.innerText = "Processing..."; btn.disabled = true;
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        const tx = await contract.transfer(to, ethers.utils.parseUnits(val, 6));
        await tx.wait();
        alert("Sent!");
        location.reload();
    } catch (e) { alert("Fail!"); btn.disabled = false; btn.innerText = "Send"; }
}

// --- UTILS ---
async function fetchBalance() {
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch(e) {}
}

async function getTxLogs() {
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["event Transfer(address indexed from, address indexed to, uint256 value)"], provider);
        const logs = await contract.queryFilter(contract.filters.Transfer(userAddress), -1000, "latest");
        document.getElementById("txList").innerHTML = logs.slice(-3).reverse().map(l => `
            <div class="flex justify-between border-b border-black/5 pb-1">
                <span>To: ${l.args.to.slice(0,6)}...</span>
                <span class="text-[#138808]">-${ethers.utils.formatUnits(l.args.value, 6)} USDC</span>
            </div>`).join('');
    } catch(e) {}
}

function toggleProfile() { document.getElementById("profileMenu").classList.toggle("show"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); }
