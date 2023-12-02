import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';
import { GlobalState, ProjectStats } from '../utils/globalState';
import * as moment from 'moment-timezone';

const path = require('path');
const fs = require('fs');



function drawPieChart(statisticsType: 'Project Statistics' | 'Level Statistics') {
  const stats: ProjectStats = {};

  GlobalState.defectInfoArray.forEach(defect => {
      let key;
      if (statisticsType === 'Project Statistics') {
          key = defect.project.projectName;
      } else {
          key = defect.defectLevel;
      }

      if (stats[key]) {
          stats[key]++;
      } else {
          stats[key] = 1;
      }
  });


  const labels = Object.keys(stats);
  const counts = Object.values(stats);

  const initialColors = [
    'rgba(255, 99, 132, 0.5)',
    'rgba(255, 159, 64, 0.5)',
    'rgba(255, 205, 86, 0.5)',
    'rgba(75, 192, 192, 0.5)',
    'rgba(54, 162, 235, 0.5)',
  ];
  const backgroundColors = labels.map((_, index) => {
      if (index < initialColors.length) {
          // 使用初始颜色
          return initialColors[index];
      } else {
          // 超出初始颜色范围时，随机生成颜色
          return `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.5)`;
      }
  });

  const chartConfig = {
      type: 'pie',
      data: {
          datasets: [
              {
                  data: counts,
                  backgroundColor: backgroundColors,
                  label: 'My dataset',
              },
          ],
          labels: labels, 
      },
      options: {
          legend: {
              position: 'right',
              labels: {
                  boxWidth: 10, 
                  fontSize: 7, 
              },
          },
          title: {
              display: false,
              text: 'Pie Chart',
          },
          layout: {
            padding: {
                top: 15,
                bottom: 15,
                left: 15,
                right: 15
            }
          },
      },
  };

  const width = 320;
  const height = 180;
  const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&backgroundColor=white&width=${width}&height=${height}`;
  return chartUrl;
}


function selectEmoji(Level: string): string {
  switch (Level) {
    case "Critical":
      return "🔴"; 
    case "High":
      return "🟠"; 
    case "Medium":
      return "🟡"; 
    case "Low":
      return "⚪"; 
  }
  return "⚪"; 
}

async function fetchData(context: vscode.ExtensionContext): Promise<void> {
	try {
	  const httpClient = axios.create({
      baseURL: 'http://134.175.54.235:8101', // 设置你的baseURL
      withCredentials: true,
    });
  
	  // 使用httpClient进行POST请求
	  const response = await httpClient.post('/api/defectInfo/search/MyDefectInfoProVOList?userId=1', {
		// 你的POST数据
	  });
  
    GlobalState.defectInfoArray = response.data.data;

	} catch (error) {
	  console.error('Error during data posting:', error);
	}
}

async function modifyStatus(context: vscode.ExtensionContext, item: SideBarEntryItem, status: string): Promise<void> {
	try {
	  const httpClient = axios.create({
      baseURL: 'http://134.175.54.235:8101', // 设置你的baseURL
      withCredentials: true,
    });
  
    const data = {
      defectStatus: status,
      id: item.defectID,
      userId: item.userId
    };

	  // 使用httpClient进行POST请求
	  const response = await httpClient.post('/api/defectInfo/update', data);
  
    GlobalState.defectInfoArray = response.data.data;

	} catch (error) {
	  console.error('Error during data posting:', error);
	}
}

async function addComments(context: vscode.ExtensionContext, item: SideBarEntryItem, comment: string): Promise<void> {
	try {
	  const httpClient = axios.create({
      baseURL: 'http://134.175.54.235:8101', // 设置你的baseURL
      withCredentials: true,
    });
  
    console.log(comment)

    const data = {
      defectComment: comment,
      id: item.defectID,
      userId: item.userId
    };

	  // 使用httpClient进行POST请求
	  const response = await httpClient.post('/api/defectInfo/update', data);
  
    GlobalState.defectInfoArray = response.data.data;

	} catch (error) {
	  console.error('Error during data posting:', error);
	}
}


// Custom Tree Item Class
export class SideBarEntryItem extends vscode.TreeItem {
  constructor(
    public readonly defectName: string, 
    public readonly defectID: number,
    public readonly userId: number, 
    public readonly projectName: string,
    public readonly defectStatus: string, 
    public readonly defectType: string, 
    public readonly defectLevel: string, 
    public readonly defectDetail: string, 
    public readonly defectComments: string[], 
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {

    super(defectName, collapsibleState);
    
    if (this.label === "Project Statistics" || this.label === "Level Statistics") {
      
      this.contextValue = "statisticsEntry";
      let tooltipContent = new vscode.MarkdownString();
      tooltipContent = new vscode.MarkdownString(`![Image](${drawPieChart(this.label)})`);
      this.tooltip = tooltipContent;
      
    } else if (this.label !== "TODO" && this.label !== "FINISHED" && this.label !== "STATISTICS") {
      this.description = `${projectName}`;
      this.contextValue = "editableEntry";
      
      let tooltipContent = new vscode.MarkdownString();
      tooltipContent.appendMarkdown(`**${defectName}** ${defectLevel}\n\n`);
      tooltipContent.appendMarkdown(`- **Status:** ${defectStatus}\n`);
      tooltipContent.appendMarkdown(`- **Defect Type:** ${defectType}\n`);
      tooltipContent.appendMarkdown(`---\n\n`);
      tooltipContent.appendMarkdown(`**Defect Detail:**\n${defectDetail}\n\n`);
      tooltipContent.appendMarkdown(`---\n\n`);
      tooltipContent.appendMarkdown(`**Defect Comments**\n\n`);

      defectComments.forEach(comment => {
        tooltipContent.appendMarkdown(`---\n\n`);
        tooltipContent.appendMarkdown(`**Comment:** ${comment}\n\n`);
        
      });
      
      tooltipContent.isTrusted = true;
      this.tooltip = tooltipContent;
    }
  }
}

export class SideBarGeneric implements vscode.TreeDataProvider<SideBarEntryItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SideBarEntryItem | undefined | null | void> = new vscode.EventEmitter<SideBarEntryItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SideBarEntryItem | undefined | null | void> = this._onDidChangeTreeData.event;
  
  constructor(private workspaceRoot?: string) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SideBarEntryItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SideBarEntryItem): vscode.ProviderResult<SideBarEntryItem[]> {
    if (element) {
      if (element?.label === "STATISTICS") {
        return Promise.resolve([
            new SideBarEntryItem('Project Statistics', 0, 0, '', '', '', '', '', [], vscode.TreeItemCollapsibleState.None),
            new SideBarEntryItem('Level Statistics', 0, 0, '', '', '', '', '', [], vscode.TreeItemCollapsibleState.None)
        ]);
      }
      // Child nodes
      var childrenList = [];
      for (let index = 0; index < GlobalState.defectInfoArray.length; index++) {
        
        if (GlobalState.defectInfoArray[index].isToDo == element.label) {
          let emoji: string = selectEmoji(GlobalState.defectInfoArray[index].defectLevel);
          var item = new SideBarEntryItem(
            GlobalState.defectInfoArray[index].defectName,
            GlobalState.defectInfoArray[index].id,
            GlobalState.defectInfoArray[index].userId,
            GlobalState.defectInfoArray[index].project.projectName,
            GlobalState.defectInfoArray[index].defectStatus,
            GlobalState.defectInfoArray[index].defectType,
            emoji,
            GlobalState.defectInfoArray[index].defectDetail,
            GlobalState.defectInfoArray[index].defectComment,
            vscode.TreeItemCollapsibleState.None
          )
          
          childrenList[index] = item
        }
      }
      return childrenList
    } else {
      // Create root tags
      return [
        new SideBarEntryItem(
          'TODO',
          0,
          0,
          "null",
          "null",
          "null",
          "null",
          "null",
          [],
          vscode.TreeItemCollapsibleState.Expanded
        ),
        new SideBarEntryItem(
          'FINISHED',
          0,
          0,
          "null",
          "null",
          "null",
          "null",
          "null",
          [],
          vscode.TreeItemCollapsibleState.Expanded
        ),
        new SideBarEntryItem(
          'STATISTICS',
          0,
          0,
          "null",
          "null",
          "null",
          "null",
          "null",
          [],
          vscode.TreeItemCollapsibleState.Expanded
        ),
      ]
    }
  }
}

function registerDashboardCommands(context: vscode.ExtensionContext ,sidebar: SideBarGeneric) {
  context.subscriptions.push(vscode.commands.registerCommand('dashboard.markAsFixed', async (item: SideBarEntryItem)  => {
    await modifyStatus(context, item, "Fixed");
    await fetchData(context);
    sidebar.refresh();
    vscode.window.showInformationMessage(`Modify status for defect: ${item.defectName}`);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('dashboard.markAsDeferred', async (item) => {
    await modifyStatus(context, item, "Deferred");
    await fetchData(context);
    sidebar.refresh();
    vscode.window.showInformationMessage(`Modify status for defect: ${item.defectName}`);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('dashboard.markAsNotABug', async (item) => {
    await modifyStatus(context, item, "NotABug");
    await fetchData(context);
    sidebar.refresh();
    vscode.window.showInformationMessage(`Modify status for defect: ${item.defectName}`);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('dashboard.markAsDuplicate', async (item) => {
    await modifyStatus(context, item, "Duplicate");
    await fetchData(context);
    sidebar.refresh();
    vscode.window.showInformationMessage(`Modify status for defect: ${item.defectName}`);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('dashboard.edit', async (item) => {
    
    let activeEditor = vscode.window.activeTextEditor;
    let formattedSelection = '';

    if (activeEditor) {
        let selection = activeEditor.selection;
        if (!selection.isEmpty) {
          let startLine = selection.start.line + 1;
          let endLine = selection.end.line + 1;
          let fileName = path.basename(activeEditor.document.fileName);
          formattedSelection = `${fileName}: line ${startLine}-${endLine}`;
        }
    }

    const userInput = await vscode.window.showInputBox({
      prompt: "Enter your comment on this defect",
      placeHolder: "Type your comment here"
    });
    if (userInput) {
      
      let formattedComment = formattedSelection ? `${formattedSelection}; ${userInput}` : userInput;
      
      await addComments(context, item, formattedComment);
      await fetchData(context);
      sidebar.refresh();
      vscode.window.showInformationMessage(`Add a comment for defect: ${item.defectName}`);
    }
  
  }));
}

export function showPopup(context: vscode.ExtensionContext) {
  let fix = 0;
  let todo = 0;
  let lastPopupDate = context.globalState.get('lastPopupDate');
  console.log(lastPopupDate);
  const now = moment().tz("Asia/Hong_kong");
  const today = now.format('YYYY-MM-DD');
  console.log(today);
  if (lastPopupDate == today) {
    let content = ' ';
    GlobalState.defectInfoArray.forEach(defect => {
      if(defect.defectStatus == 'Fixed'){
        fix += 1;
      }
      else{
        todo +=1;
      }
      content = `Daily statistics: `;
      content += `[ Todo: ${todo}, Finished: ${fix} ]`;
    });
    vscode.window.showInformationMessage(content);
    context.globalState.update('lastPopupDate', today);
  }

}


module.exports = async function (context: vscode.ExtensionContext) {
  // Register Sidebar Panels
  const sidebar = new SideBarGeneric();
  
  
  vscode.window.registerTreeDataProvider('dashboard', sidebar);
  
  vscode.commands.registerCommand('dashboard.refresh', async () => {
    await fetchData(context);
    sidebar.refresh();
  });

  registerDashboardCommands(context, sidebar);

  await fetchData(context);
  sidebar.refresh();
  showPopup(context);
  
};
