const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const ARC_CHAIN = '0x4cef52';
const INR_RATE = 83.50;
let userAddress = "", provider, signer;

async function autoConnect() {
    if (!window.ethereum) return;
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
        document.getElementById("walletLabel").innerText = userAddress.slice(0, 10) + "...";
        fetchBalance();
        getTxLogs();
    } catch (e) { console.log(e); }
}

function toggleProfile() {
    userAddress ? document.getElementById("profileMenu").classList.toggle("show") : autoConnect();
}

async function fetchBalance() {
    const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
    const bal = await contract.balanceOf(userAddress);
    const f = ethers.utils.formatUnits(bal, 6);
    document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
    document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
}

function openSend() { if(!userAddress) return autoConnect(); document.getElementById("sendModal").classList.remove("hidden"); }

async function processSend() {
    const to = document.getElementById("toAddr").value;
    const val = document.getElementById("amt").value;
    const btn = document.getElementById("sBtn");
    try {
        btn.innerText = "WAITING..."; btn.disabled = true;
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        const tx = await contract.transfer(to, ethers.utils.parseUnits(val, 6));
        await tx.wait();
        alert("Sent!"); location.reload();
    } catch (e) { alert("Fail!"); btn.disabled = false; btn.innerText = "TRANSFER"; }
}

function openReceive() {
    if(!userAddress) return autoConnect();
    document.getElementById("receiveModal").classList.remove("hidden");
    document.getElementById("myAddr").innerText = userAddress;
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), { text: userAddress, width: 150, height: 150 });
}

async function getTxLogs() {
    const contract = new ethers.Contract(USDC_ADDR, ["event Transfer(address indexed from, address indexed to, uint256 value)"], provider);
    const logs = await contract.queryFilter(contract.filters.Transfer(userAddress), -100, "latest");
    document.getElementById("txList").innerHTML = logs.slice(-3).reverse().map(l => `
        <div class="flex justify-between border-b border-black/5 pb-1">
            <span>To: ${l.args.to.slice(0,6)}...</span>
            <span class="text-red-600">-${ethers.utils.formatUnits(l.args.value, 6)}</span>
        </div>`).join('');
}

function disconnectWallet() { userAddress = ""; location.reload(); }
function closeM(id) { document.getElementById(id).classList.add("hidden"); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); }
