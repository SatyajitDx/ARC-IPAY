async function processSend() {
    const to = document.getElementById("sendTo").value;
    const amt = document.getElementById("sendAmt").value;
    const btn = document.getElementById("finalSendBtn");

    if(!ethers.utils.isAddress(to)) return alert("Invalid Recipient Address!");
    if(!amt || amt <= 0) return alert("Enter a valid amount!");

    try {
        btn.innerText = "CHECKING GAS..."; btn.disabled = true;

        const gasBalance = await provider.getBalance(userAddress);
        if (gasBalance.isZero()) {
            btn.innerText = "NO GAS (ARC)";
            btn.disabled = false;
            return alert("You need ARC tokens for gas fees. Please claim from Faucet.");
        }

        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        
        btn.innerText = "WAITING FOR WALLET...";

        const tx = await contract.transfer(to, ethers.utils.parseUnits(amt, 6), {
            gasLimit: 80000 
        });
        
        btn.innerText = "CONFIRMING...";
        await tx.wait();
        
        // --- NAYA POPUP LOGIC YAHAN HAI ---
        
        // 1. Send Modal band karo
        document.getElementById("sendModal").classList.add("hidden");
        
        // 2. Receipt Modal dikhao
        document.getElementById("receiptModal").classList.remove("hidden");

        // 3. Data fill karo
        document.getElementById("recAmt").innerText = amt + " USDC";
        document.getElementById("recInr").innerText = "≈ ₹" + (amt * INR_RATE).toFixed(2);
        document.getElementById("recTo").innerText = to.substring(0,8) + "..." + to.substring(to.length - 4);
        
        // 4. Current Time set karo
        const now = new Date();
        const timeStr = now.toLocaleDateString() + " | " + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        document.getElementById("recTime").innerText = timeStr;

        btn.innerText = "CONFIRM PAYMENT"; btn.disabled = false;

    } catch (e) {
        console.error(e);
        alert("Transaction Failed!");
        btn.innerText = "CONFIRM PAYMENT"; btn.disabled = false;
    }
}
