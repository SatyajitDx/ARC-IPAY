async function processSend() {
    const to = document.getElementById("sendTo").value;
    const amt = document.getElementById("sendAmt").value;
    const btn = document.getElementById("finalSendBtn");

    if(!ethers.utils.isAddress(to)) return alert("Invalid Address!");
    if(!amt || amt <= 0) return alert("Enter valid amount!");

    try {
        btn.innerText = "PREPARING..."; btn.disabled = true;

        const gasPrice = await provider.getGasPrice();
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        
        btn.innerText = "CONFIRMING...";
        const tx = await contract.transfer(to, ethers.utils.parseUnits(amt, 6), {
            gasLimit: 150000, 
            gasPrice: gasPrice 
        });
        
        btn.innerText = "PENDING...";
        await tx.wait(1);

        // --- SUCCESS: Show Green Card ---
        document.getElementById("sendModal").classList.add("hidden");
        document.getElementById("receiptModal").classList.remove("hidden");
        
        document.getElementById("recAmt").innerText = `${amt} USDC`;
        document.getElementById("recInr").innerText = `≈ ₹${(amt * INR_RATE).toFixed(2)}`;
        document.getElementById("recTo").innerText = to.substring(0,8) + "..." + to.substring(to.length - 4);

    } catch (e) {
        console.error("TX Error:", e);
        
        // --- FAIL: Show Red Card ---
        document.getElementById("sendModal").classList.add("hidden");
        document.getElementById("failModal").classList.remove("hidden");
        
        const reason = document.getElementById("failReason");
        if (e.message.includes("txpool")) {
            reason.innerText = "Network Busy (Pool Full). Please try again in a minute.";
        } else if (e.code === 4001) {
            reason.innerText = "Transaction was cancelled by user.";
        } else {
            reason.innerText = "Something went wrong. Please check your balance.";
        }

        btn.innerText = "CONFIRM PAYMENT"; btn.disabled = false;
    }
}
