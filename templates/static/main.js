"use strict";

function toggleSettingsMenu(button) {
  const menu = document.getElementById("settings-menu");
  menu.classList.toggle("show");
  button.classList.toggle("change");
}

const socket = new WebSocket(`ws://${window.location.host}/ws/system-info/`);

const systemInfoElements = {
  cpu_temp: document.getElementById("cpu-temp"),
  cpu_usage: document.getElementById("cpu-usage"),
  physical_cores: document.getElementById("physical-cores"),
  memory_usage: document.getElementById("memory-usage"),
  disk_usage: document.getElementById("disk-usage"),
  uptime: document.getElementById("uptime"),
};

const updateSystemInfo = (data) => {
  const cpu = data["cpu"];
  const disk = data["disk"];

  if (systemInfoElements.cpu_usage && cpu) {
    systemInfoElements.cpu_usage.innerText = `CPU Usage: ${cpu["usage"]}%`;
  }
  if (systemInfoElements.cpu_temp && cpu) {
    systemInfoElements.cpu_temp.innerText = `CPU Temperature: ${cpu["temp"]}°C`;
  }
  if (systemInfoElements.physical_cores && cpu) {
    systemInfoElements.physical_cores.innerText = `CPU cores: ${cpu["physical_cores"]}`;
  }
  if (systemInfoElements.memory_usage && disk) {
    systemInfoElements.memory_usage.innerText = `RAM: ${disk["used_mem"]}GB / ${disk["total_mem"]}GB\t${disk["mem_percent"]}%`;
  }
  if (systemInfoElements.disk_usage && disk) {
    systemInfoElements.disk_usage.innerText = `Disk Usage: ${disk["used_disk"]}GB / ${disk["total_disk"]}GB\t${disk["disk_percent"]}% (free: ${disk["free_disk"]}GB)`;
  }
  if (systemInfoElements.uptime && data["uptime"]) {
    systemInfoElements.uptime.innerText = `Up for ${data["uptime"]}h`;
  }
};

socket.onmessage = (e) => {
  const data = JSON.parse(e.data);
  updateSystemInfo(data);
};

socket.onopen = () => {
  console.log("WebSocket is open now.");
};

socket.onclose = () => {
  console.log("WebSocket is closed now.");
};

function proveInput(elements) {
  var isEmpty = false;
  for (el of elements) {
    if (el.value == null) {
      el.classList.toggle("error");
      isEmpty = true;
    }
  }
  return isEmpty;
}

async function uploadApplicationProps(event) {
  event.preventDefault();

  let formData = new FormData();
  const applicationProps = document.getElementsByClassName("application-form");
  const checkBoxData = document.getElementsByClassName("checkbox");
  const csrfToken = document
    .querySelector("meta[name='csrf-token']")
    .getAttribute("content");

  // Get textbox data
  for (let prop of applicationProps) formData.append(prop.id, prop.value);

  // Get checkbox data (https, reverse proxy)
  for (let cb of checkBoxData) formData.append(cb.id, cb.checked);

  formData.append(
    "application_icon",
    document.getElementById("application_icon").files[0]
  );

  try {
    const response = await fetch("/upload/", {
      method: "POST",
      headers: {
        "X-CSRFToken": csrfToken,
      },
      body: formData,
    });

    if (response.ok) {
      alert("File uploaded successfully!");
    } else {
      alert("Failed upload the file.");
    }
  } catch (error) {
    console.log(error);
  }
}

function toggleApplicationWindow() {
  let settingsLink = document.getElementById("new-application-container");
  if (settingsLink.style.display == "flex") settingsLink.style.display = "none";
  else settingsLink.style.display = "flex";
}

function changeTheme(button) {
  button.classList.toggle("light");

  if (document.body.classList.contains("light"))
    document.body.classList.remove("light");
  else document.body.classList.add("light");
}

document.addEventListener("DOMContentLoaded", () => {
  var appStatusSocket = new WebSocket(
    `ws://${window.location.host}/ws/application-status/`
  );
  appStatusSocket.onopen = () => {
    // Send status message
    appStatusSocket.send(
      JSON.stringify({
        status: 1,
      })
    );
  };

  // Each application container gets a status light for the online status of their application
  appStatusSocket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    Array.from(document.getElementsByClassName("application-container")).forEach((app, index) => {
      const statusDiv = document.createElement("div");
      statusDiv.className = "status-div";

      const onlineStatus = document.getElementsByClassName("online-status")[index];
      const httpsIcon = document.getElementsByClassName("https-icon")[index];

      httpsIcon.classList.toggle("httpsIconStyle");

      const online = data[app.id];
      if (online) onlineStatus.style.backgroundColor = "#39ff14";
      else onlineStatus.style.backgroundColor = "#ff2f14";

      if (httpsIcon) {
        statusDiv.appendChild(httpsIcon);
      }
      if (onlineStatus) {
        statusDiv.appendChild(onlineStatus);
      }
      app.appendChild(statusDiv);
    });
  };
});
