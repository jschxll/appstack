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

function getCSRFToken() {
  const csrfToken = document
    .querySelector("meta[name='csrf-token']")
    .getAttribute("content");

  return csrfToken;
}

function addNewApplicationToDOM(html) {
  const appSection = document.querySelector(".application-section");
  let appSectionUl = appSection.querySelector("ul");

  if (!appSectionUl) {
    const placeholder = appSection.querySelector("p");
    if (placeholder) {
      placeholder.remove();
    }
    appSectionUl = document.createElement("ul");
    appSection.appendChild(appSectionUl);
  }
  //const newApp = document.createElement("li");
  appSectionUl.innerHTML += html;
  //appSectionUl.appendChild(newApp);
}

async function uploadApplicationProps(event) {
  event.preventDefault();

  const nameField = document.getElementById("application_name");
  const appNameLabel = document.getElementById("app-name-label");
  const hostField = document.getElementById("application_host");
  const appHostLabel = document.getElementById("app-host-label");

  let formData = new FormData();
  const applicationProps = document.getElementsByClassName("application-form");
  const checkBoxData = document.getElementsByClassName("checkbox");
  const csrfToken = getCSRFToken();

  for (let prop of applicationProps) formData.append(prop.id, prop.value);
  for (let cb of checkBoxData) {
    console.log(cb.id, cb.checked);
    formData.append(cb.id, cb.checked);
  }
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
    const data = await response.json();

    if (data.status == "success") {
      addNewApplicationToDOM(data.html);
      document.getElementById("new-application-container").style.display =
        "none";

      if (
        nameField.classList.contains("error") ||
        hostField.classList.contains("error")
      ) {
        nameField.classList.remove("error");
        appNameLabel.classList.remove("error");
        appNameLabel.innerText = "Application Name";
        hostField.classList.remove("error");
        appHostLabel.classList.remove("error");
        appHostLabel.innerText = "IP Address:Port";
      }
    } else if (data.status == "already exist") {
      if (
        nameField.classList.contains("error") ||
        hostField.classList.contains("error")
      ) {
        nameField.classList.remove("error");
        appNameLabel.classList.remove("error");
        appNameLabel.innerText = "Application Name";
        hostField.classList.remove("error");
        appHostLabel.classList.remove("error");
        appHostLabel.innerText = "IP Address:Port";
      }
      const affectedProps = data["affected_properties"];
      Array.from(affectedProps).forEach((prop) => {
        if (prop == "app.name") {
          if (!nameField.classList.contains("error") 
            && !appNameLabel.classList.contains("error")) {
            nameField.classList.toggle("error");
            appNameLabel.classList.toggle("error");
            appNameLabel.innerText = "This name already exists!";
          }
        }
        if (prop == "app.port") {
          if (!hostField.classList.contains("error") 
            && !appHostLabel.classList.contains("error")) {
            hostField.classList.toggle("error");
            appHostLabel.classList.toggle("error");
            appHostLabel.innerText = "This port already exists!";
          }
        }
      });
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

async function queryApplication(appName) {
  const response = await new AppAPI().getApplication(appName);
  if (response == null) {
    alert("This hasn't worked. Please check your Internet connection!");
    return;
  }

  console.log(response["app_name"]);
  document.getElementsByClassName(`edit-application-form-${appName}`)[0].value = response["app_name"];
  document.getElementsByClassName(`edit-application-form-${appName}`)[1].value = response["app_host"];
  document.getElementsByClassName(`edited-checkbox-${appName}`)[0].checked = response["https"];
  document.getElementsByClassName(`edited-checkbox-${appName}`)[1].checked = response["use_reverse_proxy"];
}

function toggleEditAppWindow(appName) {
  let editAppWindow = document.getElementById(`edit-application-container-${appName}`);
  if (editAppWindow.style.display == "flex") {
    editAppWindow.style.display = "none";
  } else {
    queryApplication(appName);
    editAppWindow.style.display = "flex";
  }
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
    console.log("opened");
  };
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

      const onlineStatus =
        document.getElementsByClassName("online-status")[index];
      const httpsIcon = document.getElementsByClassName("https-icon")[index];

      httpsIcon.classList.toggle("httpsIconStyle");

      const online = data[app.id];
      if (online) onlineStatus.style.backgroundColor = "#39ff14";
      else onlineStatus.style.backgroundColor = "#ff2f14";

      if (httpsIcon) statusDiv.appendChild(httpsIcon);
      if (onlineStatus) statusDiv.appendChild(onlineStatus);

      // Add status info to app-icon-container
      app.appendChild(statusDiv);
    });
  };
});

function editAppSettings(button) {
  const indexStr = String(button.id);
  const index = indexStr.substring(indexStr.length - 1);
  const dropDown = document.getElementById(`dropdown-content-${index}`);
  if (dropDown.classList.contains("show")) dropDown.classList.remove("show");
  else dropDown.classList.toggle("show");
}

function deleteApplication(name) {
  const appAPI = new AppAPI();
  appAPI.sendDeleteRequest(name);
  appAPI.removeFromFrontend();
}

function editApplication(appName) {
  var formData = new FormData();
  const editedTextField = document.getElementsByClassName(`edit-application-form-${appName}`);
  const editedIcon = document.getElementById(`edited_application_icon-${appName}`).files[0];
  const editedCheckBoxes = document.getElementsByClassName(`edited-checkbox-${appName}`);
  for (let txtField of editedTextField)
    formData.append(txtField.id, txtField.value);
  for (let checkBox of editedCheckBoxes)
    formData.append(checkBox.id, checkBox.checked);

  formData.append("edited_icon", editedIcon);
  console.log(formData);
  new AppAPI().sendEditRequest(formData);
}

class AppAPI {
  removeFromFrontend() {
    const updateAppsSocket = new WebSocket(
      `ws://${window.location.host}/ws/update_applications/`
    );
    updateAppsSocket.onmessage = (e) => {
      const message = JSON.parse(e.data);
      if (message.type == "delete_app") {
        const appName = message.app_name;
        const appElement = document.getElementById(`${appName}-item`);
        if (appElement) appElement.remove();
      }
    };
  }

  async sendDeleteRequest(name) {
    try {
      var nameAsJson = JSON.stringify({ app_name: name });
      const response = await fetch("/api/delete_application", {
        method: "PUT",
        headers: {
          "X-CSRFToken": getCSRFToken(),
        },
        body: nameAsJson,
      });

      if (!response.ok) {
        alert(`Something went wrong. Error:${response.status}`);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async getApplication(appName) {
    try {
      const response = await fetch(`/api/get_application?application=${encodeURIComponent(appName)}`, {
        method: "GET",
        headers: {
          "X-CSRFToken": getCSRFToken(),
        }
      });
      
      if (response.ok) {
        return response.json();
      } else {
        console.error('Failed to fetch:', response.status, response.statusText);
      }
    } catch (error) {
      console.error(error);
    }
    return null;
  }

  async sendEditRequest(appForm) {
    try {
      await fetch("/api/edit_application", {
        method: "PUT",
        headers: {
          "X-CSRFToken": getCSRFToken(),
        },
        body: appForm,
      })
        .then((response) => response.json())
        .then((data) => console.log(data));
    } catch (error) {
      console.error(error);
    }
  }
}
