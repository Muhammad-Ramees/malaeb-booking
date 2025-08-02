document.getElementById("booking-form").addEventListener("submit", function(event) {
    event.preventDefault();

    const form = document.getElementById("booking-form");
    const formData = new FormData(form);

    fetch("https://script.google.com/macros/s/AKfycbzTj3oDEI--3jDRcBnkPeVNc697tWgfSao-xMp4zQoEDQypVo0B99AIaz4TWGRbkbHj/exec", {
        method: "POST",
        body: formData,
    })
    .then(response => response.text())
    .then(result => {
        document.getElementById("message").textContent = "✅ Booking submitted!";
    })
    .catch(error => {
        document.getElementById("message").textContent = "⚠️ Network or CORS error.";
        console.error("Fetch error:", error);
    });
});
