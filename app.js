const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const ARC_CHAIN = '0x4cef52'; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer;

async function connectWallet() {
    if (!window.ethereum) return alert("Install Wallet!");
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        const network = await provider.getNetwork();
        if (ethers.utils.hexValue(network.chainId) !== ARC_CHAIN) {
            await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ARC_CHAIN }] });
        }

        document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
        document.getElementById("dot").classList.remove("animate-pulse");
        document.getElementById("walletLabel").innerText = userAddress.slice(0, 8) + "...";
        fetchBalance();
    } catch (e) { console.log(e); }
}

function toggleProfile() {
    userAddress ? document.getElementById("profileMenu").classList.toggle("show") : connectWallet();
}

function disconnectWallet() {
    userAddress = "";
    location.reload(); // Hard reset for clean disconnect
}

async function fetchBalance() {
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch (e) { console.error(e); }
}

// ACTION TOOLS
function openSend() { if(!userAddress) return connectWallet(); document.getElementById("sendModal").classList.remove("hidden"); }
function openReceive() { 
    if(!userAddress) return connectWallet(); 
    document.getElementById("receiveModal").classList.remove("hidden");
    document.getElementById("myFullAddr").innerText = userAddress;
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), { text: userAddress, width: 180, height: 180 });
}

async function processSend() {
    const to = document.getElementById("sendAddr").value;
    const val = document.getElementById("sendAmt").value;
    const btn = document.getElementById("sendS");
    try {
        btn.innerText = "WAITING..."; btn.disabled = true;
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        const tx = await contract.transfer(to, ethers.utils.parseUnits(val, 6));
        await tx.wait();
        alert("Sent Successfully!"); location.reload();
    } catch (e) { alert("Transaction Failed!"); btn.disabled = false; btn.innerText = "Transfer"; }
}

async function getTxLogs() {
    if(!userAddress) return connectWallet();
    alert("Check Console for Real-Time Logs!");
    console.log("Fetching Logs from Arc Testnet...");
}

function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); }

// Global click to close menu
window.onclick = function(event) {
    if (!event.target.matches('#walletBtn, #walletBtn *')) {
        const menu = document.getElementById("profileMenu");
        if (menu && menu.classList.contains('show')) menu.classList.remove('show');
    }
}
