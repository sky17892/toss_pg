import './style.css'
//import { HomePage, initHomePage } from './components/list-item'
import { ListItemPage, initHomePage } from './components/index'
import { showModal, hideAllModals } from './components/showmodal'

export function navigateTo(page: string) {
  hideAllModals() // 기존 모달 모두 숨기기

  switch (page) {
    /*case 'list-item': {
      const listModal = document.getElementById('listModal')
      if (listModal) {
        listModal.innerHTML = 
          <div class="modal-content" id="listModalContent">
            ${ListItemPage()}
          </div>
        
        initListItemPage()
        showModal('listModal')
      }
      break
    }
    case 'home':
    default: {
      const homeModal = document.getElementById('homeModal')
      if (homeModal) {
        homeModal.innerHTML = 
          <div class="modal-content" id="homeModalContent">
            ${HomePage()}
          </div>
        
        initHomePage()
        showModal('homeModal')
      }
    }*/
    case 'home': {
      const homeModal = document.getElementById('homeModal')
      if (homeModal) {
        homeModal.innerHTML = `
          <div class="modal-content" id="homeModalContent">
            ${ListItemPage()}
          </div>
        `
        initHomePage()
        showModal('homeModal')
      }
      break
    }
  }
}

// 브라우저 뒤로가기 처리
window.onpopstate = (event) => {
  const page = event.state?.page || 'home'
  navigateTo(page)
}

// 초기 진입 시
navigateTo('home') 